import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generateCompletion } from "~/lib/llm-service";

export const historyRouter = createTRPCRouter({
  getCommits: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.commit.findMany({
        where: { projectId: input.projectId },
        orderBy: { commitDate: "desc" },
        take: 50,
      });
    }),

  search: privateProcedure
    .input(z.object({ 
      projectId: z.string(), 
      query: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      // Search in commit messages and summaries
      const commits = await ctx.db.commit.findMany({
        where: {
          projectId: input.projectId,
          OR: [
            { commitMessage: { contains: input.query, mode: 'insensitive' } },
            { summary: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        orderBy: { commitDate: "desc" },
      });

      if (commits.length === 0) return { answer: "No matching commits found.", commits: [] };

      // Get user API keys for AI analysis
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

      const historyContext = commits
        .slice(0, 10)
        .map(c => `Date: ${c.commitDate}\nMsg: ${c.commitMessage}\nSummary: ${c.summary}`)
        .join("\n\n");

      const prompt = `
        You are a Code Archaeologist. Based on the following commit history context, answer the user's question about how the project evolved.
        
        CONTEXT:
        ${historyContext}
        
        USER QUESTION: ${input.query}
        
        THOUGHTS:
        - Identify when major changes happened.
        - Mention specific authors if relevant.
        - Be technical but clear.
      `;

      const analysis = await generateCompletion(prompt, {
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
        strictProvider: false,
      });

      return {
        answer: analysis.text,
        commits,
      };
    }),
});
