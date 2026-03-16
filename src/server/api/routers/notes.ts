import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const notesRouter = createTRPCRouter({
  getNotes: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.userToProject.findFirst({
        where: { projectId: input.projectId, userId: ctx.user.userId }
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this project" });

      return await ctx.db.knowledgeNote.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              imageUrl: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  addNote: privateProcedure
    .input(z.object({
      projectId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.userToProject.findFirst({
        where: { projectId: input.projectId, userId: ctx.user.userId }
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this project" });

      return await ctx.db.knowledgeNote.create({
        data: {
          content: input.content,
          projectId: input.projectId,
          userId: ctx.user.userId,
        }
      });
    }),

  editNote: privateProcedure
    .input(z.object({
      id: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.knowledgeNote.findUnique({
        where: { id: input.id },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      // Allow if user owns the note OR is an ADMIN of the project
      if (note.userId !== ctx.user.userId) {
        const isAdmin = await ctx.db.userToProject.findFirst({
          where: { projectId: note.projectId, userId: ctx.user.userId, role: "ADMIN" },
        });
        if (!isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own notes" });
        }
      }

      return await ctx.db.knowledgeNote.update({
        where: { id: input.id },
        data: { content: input.content },
      });
    }),

  deleteNote: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.knowledgeNote.findUnique({
        where: { id: input.id },
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      // Allow if user owns the note OR is an ADMIN of the project
      if (note.userId !== ctx.user.userId) {
        const isAdmin = await ctx.db.userToProject.findFirst({
          where: { projectId: note.projectId, userId: ctx.user.userId, role: "ADMIN" },
        });
        if (!isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own notes" });
        }
      }

      await ctx.db.knowledgeNote.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
