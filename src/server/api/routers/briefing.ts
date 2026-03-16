import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generateCompletion } from "~/lib/llm-service";

export const briefingRouter = createTRPCRouter({
  generate: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        include: {
          commits: {
            orderBy: { commitDate: "desc" },
            take: 10,
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Get user API keys for fallback support
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

      const commitContext = project.commits
        .map(c => `- ${c.commitMessage} (${c.commitAuthorName}): ${c.summary}`)
        .join("\n");

      const prompt = `
        You are a tech podcast host for "Project Newsroom". Create a daily briefing script for the project "${project.name}" based on recent activity.
        
        RECENT COMMITS:
        ${commitContext}
        
        FORMAT:
        1. **The Hook**: A catchy opening (e.g., "Welcome back to the dev logs!").
        2. **Main Highlights**: Discuss the most important changes from the commits.
        3. **The 'Why'**: Explain why these changes matter for the project.
        4. **Closing**: A motivational sign-off.
        
        Keep the tone energetic, professional, and engaging. Use technical terms correctly.
      `;

      const result = await generateCompletion(prompt, {
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
        strictProvider: false,
      });

      const displayDate = new Date().toLocaleDateString();

      // Save to history
      await ctx.db.dailyBrief.create({
          data: {
              projectId: input.projectId,
              userId: ctx.user.userId,
              script: result.text,
              date: displayDate,
          }
      });

      return {
        script: result.text,
        date: displayDate,
        commitsProcessed: project.commits.length,
      };
    }),

  getHistory: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.dailyBrief.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    }),
});
