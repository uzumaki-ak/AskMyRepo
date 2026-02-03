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
import { pollCommits, summariseCommit } from "~/lib/github";
import { indexGithubRepo } from "~/lib/github-loader";

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
          userId
        }
      }
    }
   })
   await indexGithubRepo(project.id, input.githubUrl, input.githubToken)
   await pollCommits(project.id, input.githubToken)
   return project
  }),
  getProjects: privateProcedure.query(async({ctx})=> {
    return await ctx.db.project.findMany({
      where: {
        userToProjects: {
          some: {
            userId: ctx.user.userId!
          }
        },
        deletedAt: null
      }
    })
  }),
  getEmbeddingStatus: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const count = await ctx.db.sourceCodeEmbedding.count({
        where: { projectId: input.projectId },
      })
      return { hasEmbeddings: count > 0, count }
    }),
  getCommits: privateProcedure.input(z.object ({
    projectId : z.string()
  })).query(async ({ctx, input}) => {
    pollCommits(input.projectId).then().catch(console.error)
    return await ctx.db.commit.findMany({where:  {projectId: input.projectId}})
  }),
  resummarizeCommits: privateProcedure.input(
    z.object({
      projectId: z.string(),
      githubToken: z.string().optional(),
      limit: z.number().min(1).max(50).optional(),
    })
  ).mutation(async ({ ctx, input }) => {
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
})
