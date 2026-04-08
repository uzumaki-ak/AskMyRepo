import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { requireProjectMembership } from "../project-access";

export const collaborationRouter = createTRPCRouter({
  inviteTeammate: privateProcedure
    .input(z.object({
      projectId: z.string(),
      email: z.string().email(),
      role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { name: true }
      });

      // 1. Check if user is ADMIN of the project
      let adminEntry = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId,
          role: "ADMIN",
        }
      });

      if (!adminEntry) {
        // Fallback: If the project has NO admins at all (e.g. legacy project),
        // and this user is a member, promote them to ADMIN.
        const anyAdmin = await ctx.db.userToProject.findFirst({
          where: { projectId: input.projectId, role: "ADMIN" }
        });

        if (!anyAdmin) {
          const userMembership = await ctx.db.userToProject.findFirst({
            where: { projectId: input.projectId, userId: ctx.user.userId }
          });

          if (userMembership) {
            await ctx.db.userToProject.update({
              where: { id: userMembership.id },
              data: { role: "ADMIN" }
            });
            adminEntry = userMembership;
          }
        }
      }

      if (!adminEntry) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only project admins can invite teammates.",
        });
      }

      // 2. Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

      // 3. Save invitation
      const invitation = await ctx.db.invitation.upsert({
        where: {
          email_projectId: {
            email: input.email,
            projectId: input.projectId,
          }
        },
        create: {
          email: input.email,
          projectId: input.projectId,
          role: input.role,
          token,
          expiresAt,
        },
        update: {
          token,
          expiresAt,
          role: input.role,
        }
      });

      // 4. Generate Link
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${token}`;
      
      return { success: true, inviteUrl };
    }),

  getMembers: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      return await ctx.db.userToProject.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              emailAddress: true,
              imageUrl: true,
            }
          }
        }
      });
    }),

  removeMember: privateProcedure
    .input(z.object({ 
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const adminEntry = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId,
          role: "ADMIN",
        }
      });

      if (!adminEntry) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove members" });
      }

      if (input.userId === ctx.user.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself" });
      }

      await ctx.db.userToProject.delete({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId,
          }
        }
      });

      return { success: true };
    }),

  acceptInvitation: privateProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
      });

      if (!invitation || invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation invalid or expired",
        });
      }

      // Ensure user exists in our DB (sync from Clerk)
      await ctx.db.user.upsert({
        where: { id: ctx.user.userId },
        update: {},
        create: { id: ctx.user.userId },
      });

      // Add user to project
      await ctx.db.userToProject.upsert({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: invitation.projectId,
          }
        },
        create: {
          userId: ctx.user.userId,
          projectId: invitation.projectId,
          role: invitation.role,
        },
        update: {
          role: invitation.role,
        }
      });

      // Delete invitation
      await ctx.db.invitation.delete({
        where: { id: invitation.id },
      });

      return { success: true, projectId: invitation.projectId };
    }),
});
