import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { generateCompletion } from "~/lib/llm-service";
import { Octokit } from "octokit";
import { decrypt } from "~/lib/encryption";
import { TRPCError } from "@trpc/server";
import { requireProjectMembership } from "../project-access";

export const agentRouter = createTRPCRouter({
  getProjectFiles: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      return await ctx.db.sourceCodeEmbedding.findMany({
        where: { projectId: input.projectId },
        select: { fileName: true },
        orderBy: { fileName: "asc" },
      });
    }),

  generateCodeChange: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        prompt: z.string(),
        selectedFile: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      // 1. Get project context
      let files: { fileName: string; sourceCode: string; summary: string }[] = [];

      if (input.selectedFile) {
        // Fetch the specifically selected file first
        const selected = await ctx.db.sourceCodeEmbedding.findFirst({
          where: {
            projectId: input.projectId,
            fileName: input.selectedFile,
          },
          select: { fileName: true, sourceCode: true, summary: true },
        });

        if (selected) {
          files.push(selected);
        }
      }

      // Fetch other relevant context files (RAG)
      const others = await ctx.db.sourceCodeEmbedding.findMany({
        where: {
          projectId: input.projectId,
          fileName: input.selectedFile ? { not: input.selectedFile } : undefined,
        },
        take: input.selectedFile ? 9 : 10,
        select: { fileName: true, sourceCode: true, summary: true },
      });

      files = [...files, ...others];

      if (files.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No indexed files found for this project.",
        });
      }

      const context = files
        .map(
          (f) =>
            `File: ${f.fileName}${f.fileName === input.selectedFile ? " (PRIORITY TARGET)" : ""}\nContent:\n${f.sourceCode}\nSummary: ${f.summary}`,
        )
        .join("\n\n---\n\n");

      // 2. Generate updated code using LLM
      const systemPrompt = `
You are an elite Senior Software Engineer. Your task is to modify the codebase based on the user's request with extreme professionalism.

${input.selectedFile ? `The user has specifically targeted the file: **${input.selectedFile}**. Focus your primary changes here unless the request explicitly requires modifying another provided file.` : "Identify the most logical file to modify from the provided context."}

CRITICAL BEHAVIOR RULES:
1. **NO LITERAL ECHOING**: Never repeat the user's prompt (e.g., "adding comment for streak") in the code or commit message.
2. **PROFESSIONAL CHANGES**: Even for "minimal" or "streak" requests, perform a high-quality technical action:
   - Add a helpful TODO comment about a future feature.
   - Refactor a small piece of logic for better readability.
   - Improve JSDoc/documentation for an existing function.
   - Add a missing 'use client' or optimization.
3. **TECHNICAL COMMIT MESSAGES**: The commit message must describe the TECHNICAL CHANGE made, NOT the user's intent. 
   - BAD: "chore: add comment to maintain streak"
   - GOOD: "docs: add missing JSDoc for auth handler" or "refactor: simplify theme toggle logic"
4. **JSON RESPONSE ONLY**: Return ONLY a JSON object:
{
  "fileName": "Relative/path/to/file",
  "oldCode": "The exact original code block",
  "newCode": "The complete new code for that file",
  "commitMessage": "A professional, conventional commit message"
}
`;

      const response = await generateCompletion(
        `${systemPrompt}\n\nCONTEXT:\n${context}\n\nUSER REQUEST: ${input.prompt}`,
        {
          maxTokens: 3000,
          temperature: 0.1,
          // Use user's preferred LLM
        }
      );

      try {
        // Find the JSON block in the response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        const change = JSON.parse(jsonMatch[0]);
        return change;
      } catch (error) {
        console.error("Failed to parse AI change:", response.text);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI failed to generate a structured change. Content: " + response.text.substring(0, 100) + "...",
        });
      }
    }),

  commitFileChange: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        fileName: z.string(),
        content: z.string(),
        commitMessage: z.string(),
        prompt: z.string(),
        oldCode: z.string(),
        newCode: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      // 1. Get the GitHub token for this user or project
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      // Check for user-specific GitHub token first
      const userKey = await ctx.db.userApiKey.findUnique({
        where: {
          userId_provider: {
            userId: ctx.user.userId,
            provider: "github",
          },
        },
      });

      let token = process.env.GITHUB_TOKEN;
      if (userKey?.isActive && userKey.apiKey) {
        try {
          token = decrypt(userKey.apiKey);
        } catch (e) {
          console.error("Failed to decrypt GitHub token", e);
        }
      }

      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "GitHub token not found. Please add a token in settings.",
        });
      }

      // 2. Use Octokit to push the change
      const octokit = new Octokit({ auth: token });
      
      try {
        // Extract owner and repo from URL
        const url = new URL(project.githubUrl);
        const [owner, repo] = url.pathname.split("/").filter(Boolean);

        if (!owner || !repo) throw new Error("Invalid GitHub URL");

        // Get the current file SHA (required for updates)
        let sha: string | undefined;
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: input.fileName,
          });
          if (!Array.isArray(fileData)) {
            sha = fileData.sha;
          }
        } catch (e) {
          // File might be new
          console.log("File not found on GitHub, creating new file.");
        }

        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: input.fileName,
          message: input.commitMessage,
          content: Buffer.from(input.content).toString("base64"),
          sha,
        });

        // 3. Save to AI Change History
        await ctx.db.aiChange.create({
          data: {
            projectId: input.projectId,
            userId: ctx.user.userId,
            fileName: input.fileName,
            oldCode: input.oldCode,
            newCode: input.newCode,
            prompt: input.prompt,
            commitMessage: input.commitMessage,
            commitUrl: data.commit.html_url,
          }
        });

        return { 
          success: true, 
          url: data.commit.html_url,
          message: "Successfully pushed to GitHub!" 
        };
      } catch (error: any) {
        console.error("GitHub Commit Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "GitHub Push Failed: " + (error.message || "Unknown error"),
        });
      }
    }),

  getAiHistory: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      return await ctx.db.aiChange.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }),
});
