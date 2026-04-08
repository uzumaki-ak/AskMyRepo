// import { z } from "zod";
// import { createTRPCRouter, privateProcedure, publicProcedure } from "../trpc";
// import { pollCommits } from "~/lib/github";
// import { indexGithubRepo } from "~/lib/github-loader";

// export const projectRouter = createTRPCRouter({
//   createProject: privateProcedure.input(
//     z.object({
//       name:z.string().min(3),
//       githubUrl: z.string(),
//       githubToken: z.string().optional()

//     })
//   ).mutation(async({ctx, input}) => {
//    const project = await ctx.db.project.create({
//     data: {
//       githubUrl: input.githubUrl,
//       name: input.name,

//       userToProjects: {
//         create: {
//           userId: ctx.user.userId!
//         }
//       }
//     }
//    })
//    await indexGithubRepo(project.id, input.githubUrl, input.githubToken)
//    await pollCommits(project.id)
//   // await pollCommits(project.id, input.githubToken);

//    return project
//   }),
//   getProjects: privateProcedure.query(async({ctx})=> {
//     return await ctx.db.project.findMany({
//       where: {
//         userToProjects: {
//           some: {
//             userId: ctx.user.userId!
//           }
//         },
//         deletedAt: null
//       }
//     })
//   }),
//   getCommits: privateProcedure.input(z.object ({
//     projectId : z.string()
//   })).query(async ({ctx, input}) => {
//     pollCommits(input.projectId).then().catch(console.error)
//     return await ctx.db.commit.findMany({where:  {projectId: input.projectId}})
//   })
// })





import { z } from "zod";
import { createTRPCRouter, privateProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { pollCommits, summariseCommit } from "~/lib/github";
import { indexGithubRepo } from "~/lib/github-loader";
import { requireProjectMembership } from "../project-access";

export const projectRouter = createTRPCRouter({
  createProject: privateProcedure.input(
    z.object({
      name:z.string().min(3),
      githubUrl: z.string(),
      githubToken: z.string().optional()

    })
  ).mutation(async({ctx, input}) => {
   const userId = ctx.user.userId
   await ctx.db.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
   })
   const project = await ctx.db.project.create({
    data: {
      githubUrl: input.githubUrl,
      name: input.name,

      userToProjects: {
        create: {
          userId,
          role: 'ADMIN'
        }
      }
    }
   })
   const userKeys = await ctx.db.userApiKey.findMany({
     where: { userId, isActive: true },
     select: { provider: true, apiKey: true },
   })
   const apiKeyMap: Record<string, string> = {}
   for (const key of userKeys) {
     apiKeyMap[key.provider] = key.apiKey
   }
   const userPref = await ctx.db.user.findUnique({
     where: { id: userId },
     select: { preferredProvider: true },
   })
   await indexGithubRepo(project.id, input.githubUrl, input.githubToken, {
     userApiKeys: apiKeyMap,
     preferredProvider: userPref?.preferredProvider ?? undefined,
   })
   await pollCommits(project.id, input.githubToken)
   return project
  }),
  getProjects: privateProcedure.query(async({ctx})=> {
    const projects = await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!
          }
        },
        deletedAt: null
      },
      include: {
        _count: {
          select: {
            commits: true,
          },
        },
        userToProjects: {
          where: { userId: ctx.user.userId! },
          select: { role: true },
        },
      },
    })
    return projects.map(p => ({
      ...p,
      userRole: p.userToProjects[0]?.role ?? 'MEMBER',
      commitCount: p._count.commits,
      userToProjects: undefined,
    }))
  }),
  getEmbeddingStatus: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      const count = await ctx.db.sourceCodeEmbedding.count({
        where: { projectId: input.projectId },
      })
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: {
          githubUrl: true,
          embeddingTotal: true,
          embeddingIndexed: true,
          embeddingStatus: true,
          embeddingLastError: true,
          embeddingLastAttemptAt: true,
          embeddingRetryCount: true,
        },
      })
      const total = project?.embeddingTotal ?? count
      const indexed = project?.embeddingIndexed ?? count
      let status =
        project?.embeddingStatus ??
        (indexed >= total && total > 0
          ? "complete"
          : indexed > 0
            ? "partial"
            : "idle")

      // Auto-resume indexing in the background if it's incomplete.
      if (
        project &&
        project.githubUrl &&
        status !== "complete" &&
        status !== "indexing"
      ) {
        const now = Date.now()
        const lastAttempt = project.embeddingLastAttemptAt?.getTime() ?? 0
        const minutesSince = (now - lastAttempt) / 60000
        const shouldRetry = minutesSince >= 5
        if (shouldRetry) {
          const updated = await ctx.db.project.updateMany({
            where: {
              id: input.projectId,
              embeddingStatus: { in: ["idle", "partial", "failed"] },
            },
            data: {
              embeddingStatus: "indexing",
              embeddingLastAttemptAt: new Date(),
              embeddingLastError: null,
              embeddingRetryCount: { increment: 1 },
            },
          })
          if (updated.count === 1) {
            status = "indexing"
            const userKeys = await ctx.db.userApiKey.findMany({
              where: { userId: ctx.user.userId, isActive: true },
              select: { provider: true, apiKey: true },
            })
            const apiKeyMap: Record<string, string> = {}
            for (const key of userKeys) {
              apiKeyMap[key.provider] = key.apiKey
            }
            const userPref = await ctx.db.user.findUnique({
              where: { id: ctx.user.userId },
              select: { preferredProvider: true },
            })
            void indexGithubRepo(
              input.projectId,
              project.githubUrl,
              undefined,
              {
                resume: true,
                userApiKeys: apiKeyMap,
                preferredProvider: userPref?.preferredProvider ?? undefined,
              },
            ).catch(async (error) => {
              await ctx.db.project.update({
                where: { id: input.projectId },
                data: {
                  embeddingStatus: "failed",
                  embeddingLastError:
                    error instanceof Error ? error.message : String(error),
                },
              })
            })
          }
        }
      }

      return {
        hasEmbeddings: count > 0,
        count,
        total,
        indexed,
        status,
        lastError: project?.embeddingLastError ?? null,
        lastAttemptAt: project?.embeddingLastAttemptAt ?? null,
        retryCount: project?.embeddingRetryCount ?? 0,
      }
    }),
  getCommits: privateProcedure.input(z.object ({
    projectId : z.string()
  })).query(async ({ctx, input}) => {
    await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
    return await ctx.db.commit.findMany({where:  {projectId: input.projectId}})
  }),
  syncCommits: privateProcedure.input(z.object({
    projectId: z.string(),
    githubToken: z.string().optional(),
    force: z.boolean().default(false)
  })).mutation(async ({ ctx, input }) => {
    await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
    return await pollCommits(input.projectId, input.githubToken, input.force)
  }),
  resummarizeCommits: privateProcedure.input(
    z.object({
      projectId: z.string(),
      githubToken: z.string().optional(),
      limit: z.number().min(1).max(50).optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
    const limit = input.limit ?? 5
    const project = await ctx.db.project.findUnique({
      where: { id: input.projectId },
      select: { githubUrl: true },
    })

    if (!project?.githubUrl) {
      throw new Error("GitHub URL missing. Update project settings.")
    }

    const commits = await ctx.db.commit.findMany({
      where: {
        projectId: input.projectId,
        OR: [{ summary: "" }, { summary: "Failed to generate summary" }],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    })

    let updated = 0
    let stoppedForQuota = false

    for (const commit of commits) {
      try {
        const summary = await summariseCommit(
          project.githubUrl!,
          commit.commitHash,
          input.githubToken,
        )
        await ctx.db.commit.update({
          where: { id: commit.id },
          data: { summary },
        })
        updated += 1
      } catch (error: any) {
        const message = String(error?.message ?? "")
        if (message.includes("429") || message.includes("quota")) {
          stoppedForQuota = true
          break
        }
      }

      // Free tier allows ~5/min for generateContent. Spread calls to avoid bursts.
      await new Promise((resolve) => setTimeout(resolve, 12000))
    }

    return {
      attempted: commits.length,
      updated,
      stoppedForQuota,
    }
  }),
  reindexEmbeddings: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        githubToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.projectId,
          userToProjects: {
            some: {
              userId: ctx.user.userId,
            },
          },
          deletedAt: null,
        },
        select: { id: true, githubUrl: true },
      })

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        })
      }

      const userKeys = await ctx.db.userApiKey.findMany({
        where: { userId: ctx.user.userId, isActive: true },
        select: { provider: true, apiKey: true },
      })
      const apiKeyMap: Record<string, string> = {}
      for (const key of userKeys) {
        apiKeyMap[key.provider] = key.apiKey
      }
      const userPref = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId },
        select: { preferredProvider: true },
      })

      await indexGithubRepo(project.id, project.githubUrl, input.githubToken, {
        resume: true,
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
      })

      return { success: true }
    }),
  deleteProject: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only ADMIN can delete a project
      const adminEntry = await ctx.db.userToProject.findFirst({
        where: {
          projectId: input.projectId,
          userId: ctx.user.userId,
          role: "ADMIN",
        },
      });

      if (!adminEntry) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only project admins can delete projects.",
        });
      }

      await ctx.db.project.update({
        where: { id: input.projectId },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
  summarizeSingleCommit: privateProcedure
    .input(z.object({ 
      projectId: z.string(), 
      commitHash: z.string(),
      githubToken: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectMembership(ctx.db, ctx.user.userId, input.projectId);
      const project = await ctx.db.project.findUnique({
        where: { id: input.projectId },
        select: { githubUrl: true },
      })
      if (!project?.githubUrl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project or GitHub URL not found",
        })
      }
      const summary = await summariseCommit(
        project.githubUrl,
        input.commitHash,
        input.githubToken
      )
      await ctx.db.commit.updateMany({
        where: { 
          projectId: input.projectId,
          commitHash: input.commitHash 
        },
        data: { summary },
      })
      return { summary }
    }),
})
