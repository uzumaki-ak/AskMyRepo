import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { generateCompletion } from "~/lib/llm-service";
import { TRPCError } from "@trpc/server";
import { requireProjectMembership } from "../project-access";

export const reviewRouter = createTRPCRouter({
  getReview: privateProcedure
    .input(z.object({ 
      projectId: z.string(),
      fileName: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      // 1. Get Context
      const files = await ctx.db.sourceCodeEmbedding.findMany({
        where: { 
          projectId: input.projectId,
          fileName: input.fileName || undefined
        },
        take: input.fileName ? 1 : 10,
        select: { fileName: true, sourceCode: true, summary: true }
      });

      if (files.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No source code found." });

      const context = files.map(f => `File: ${f.fileName}\nCode:\n${f.sourceCode}\nSummary: ${f.summary}`).join("\n\n---\n\n");

      const systemPrompt = `
        You are an **Elite Security Auditor and Quality Engineer**. 
        Perform a Deep AI Code Review for the following project.
        
        GOALS:
        1. Identify logic flaws, security vulnerabilities (OWASP), and performance bottlenecks.
        2. Detect "Code Blindspots": Areas where the logic is brittle, lacks error handling, or has no test coverage implied.
        3. Suggest specific refactorings with code examples.
        
        FORMAT:
        Use High-End Markdown.
        ### 🔍 Critical Findings
        ### 🛡️ Security Audit
        ### 🌑 Blindspots & Risks
        ### 🛠️ Recommended Refactors
        
        CONTEXT:
        ${context}
      `;

      const result = await generateCompletion(systemPrompt, {
        temperature: 0.2,
      });

      return result.text;
    }),

  getBlindspots: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      const summaries = await ctx.db.sourceCodeEmbedding.findMany({
        where: { projectId: input.projectId },
        select: { fileName: true, summary: true }
      });

      if (summaries.length === 0) return "No project data available for analysis.";

      const context = summaries.map(s => `File: ${s.fileName}\nSummary: ${s.summary}`).join("\n");

      const systemPrompt = `
        You are a **Strategic Product Architect**. 
        Analyze the summaries of this project and identify "Technical Blindspots".
        
        A blindspot is:
        - A missing edge case.
        - A dependency that is too tight.
        - A feature that is half-implemented based on the file names.
        - A lack of essential infrastructure (e.g. no logging, no error boundaries).
        
        FORMAT:
        Use a **Premium Professional Report** format.
        
        SUMMARIES:
        ${context}
      `;

      const result = await generateCompletion(systemPrompt, {
        temperature: 0.3,
      });

      return result.text;
    }),
});
