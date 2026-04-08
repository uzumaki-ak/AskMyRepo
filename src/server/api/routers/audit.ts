import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generateCompletion } from "~/lib/llm-service";
import { requireProjectMembership } from "../project-access";

export const auditRouter = createTRPCRouter({
  performAudit: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          sourceCodeEmbeddings: {
            select: {
              fileName: true,
              summary: true,
            },
          },
        },
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const userApiKeys = await ctx.db.userApiKey.findMany({
        where: { userId: ctx.user.userId, isActive: true },
      });

      const apiKeyMap: Record<string, string> = {};
      for (const key of userApiKeys) {
        apiKeyMap[key.provider] = key.apiKey;
      }
      const userPref = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId },
        select: { preferredProvider: true },
      });

      const context = project.sourceCodeEmbeddings
        .map(e => `File: ${e.fileName}\nSummary: ${e.summary}`)
        .join("\n\n");

      const prompt = `
        Analyze the following code context and provide a health audit for the project "${project.name}".
        
        CONTEXT:
        ${context}
        
        TASK:
        Rate the project from 0-100 on the following metrics:
        1. **Complexity** (High score = very spaghetti/complex, Low score = clean/simple)
        2. **Documentation** (High score = well documented, Low score = missing summaries/comments)
        3. **Modernity** (High score = using latest patterns/libraries, Low score = legacy code)
        4. **Maintainability** (High score = easy to update, Low score = fragile)
        
        Return the result as a JSON object:
        {
          "complexity": number,
          "documentation": number,
          "modernity": number,
          "maintainability": number,
          "summary": "Short 2-sentence textual health summary"
        }
      `;

      const result = await generateCompletion(prompt, {
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
        strictProvider: false,
      });

      try {
        const cleanedText = result.text.replace(/```json|```/g, "").trim();
        const auditData = JSON.parse(cleanedText) as {
          complexity: number;
          documentation: number;
          modernity: number;
          maintainability: number;
          summary: string;
        };

        // Save to history
        await ctx.db.projectAudit.create({
            data: {
                projectId: input.projectId,
                userId: ctx.user.userId,
                complexity: auditData.complexity,
                documentation: auditData.documentation,
                modernity: auditData.modernity,
                maintainability: auditData.maintainability,
                summary: auditData.summary,
            }
        });

        return auditData;
      } catch (error) {
        console.error("Audit parse fail:", result.text);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse audit metrics.",
        });
      }
    }),

  getHistory: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      return await ctx.db.projectAudit.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    }),
});
