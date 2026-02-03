import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";

const fileReferenceSchema = z.object({
  fileName: z.string(),
  sourceCode: z.string(),
  summary: z.string().optional(),
});

export const questionRouter = createTRPCRouter({
  save: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string().min(1),
        answer: z.string().min(1),
        fileReferences: z.array(fileReferenceSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.userId;
      await ctx.db.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });

      return await ctx.db.savedQuestion.create({
        data: {
          userId,
          projectId: input.projectId,
          question: input.question,
          answer: input.answer,
          fileReferences: input.fileReferences ?? [],
        },
      });
    }),
  list: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.savedQuestion.findMany({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId,
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
