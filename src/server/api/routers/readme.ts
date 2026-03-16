import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { generateReadme, generateMermaidDiagram, LLM_PROVIDERS } from "~/lib/llm-service";
import { TRPCError } from "@trpc/server";

export const readmeRouter = createTRPCRouter({
  // Get generated README for a project
  get: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const readme = await ctx.db.generatedReadme.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: input.projectId,
          },
        },
      });
      return readme;
    }),

  // Generate a new README
  generate: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        customPrompt: z.string().optional(),
        includeMermaid: z.boolean().optional(),
        includeArchitecture: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get project details
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

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check if user has access to this project
      const userProject = await ctx.db.userToProject.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: input.projectId,
          },
        },
      });

      if (!userProject) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }

      // Get user's API keys
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
      const preferredProvider = userPref?.preferredProvider ?? undefined;

      // Build context from embeddings (summaries, not full code)
      const contextParts = project.sourceCodeEmbeddings.map(
        (embedding) => `--- ${embedding.fileName} ---\n${embedding.summary}\n`
      );
      const context = contextParts.join("\n");

      // Generate README
      const result = await generateReadme(context, project.name, project.githubUrl, {
        userApiKeys: apiKeyMap,
        customPrompt: input.customPrompt,
        includeMermaid: input.includeMermaid,
        includeArchitecture: input.includeArchitecture,
        preferredProvider,
        strictProvider: false,
      });

      // Save to database
      const savedReadme = await ctx.db.generatedReadme.upsert({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: input.projectId,
          },
        },
        create: {
          userId: ctx.user.userId,
          projectId: input.projectId,
          content: result.text,
          prompt: input.customPrompt,
          includeMermaid: input.includeMermaid ?? false,
          model: result.model,
        },
        update: {
          content: result.text,
          prompt: input.customPrompt,
          includeMermaid: input.includeMermaid ?? false,
          model: result.model,
          updatedAt: new Date(),
        },
      });

      return {
        content: result.text,
        provider: result.provider,
        model: result.model,
        saved: savedReadme,
      };
    }),

  // Regenerate with new prompt
  regenerate: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        customPrompt: z.string().optional(),
        includeMermaid: z.boolean().optional(),
        includeArchitecture: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This is essentially the same as generate, but semantically different
      return ctx.db.$transaction(async () => {
        // Get project details
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

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        // Check access
        const userProject = await ctx.db.userToProject.findUnique({
          where: {
            userId_projectId: {
              userId: ctx.user.userId,
              projectId: input.projectId,
            },
          },
        });

        if (!userProject) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have access to this project",
          });
        }

        // Get user's API keys
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
        const preferredProvider = userPref?.preferredProvider ?? undefined;

        // Build context
        const contextParts = project.sourceCodeEmbeddings.map(
          (embedding) => `--- ${embedding.fileName} ---\n${embedding.summary}\n`
        );
        const context = contextParts.join("\n");

        // Generate README
        const result = await generateReadme(context, project.name, project.githubUrl, {
          userApiKeys: apiKeyMap,
          customPrompt: input.customPrompt,
          includeMermaid: input.includeMermaid,
          includeArchitecture: input.includeArchitecture,
          preferredProvider,
          strictProvider: false,
        });

        // Update existing record
        const savedReadme = await ctx.db.generatedReadme.update({
          where: {
            userId_projectId: {
              userId: ctx.user.userId,
              projectId: input.projectId,
            },
          },
          data: {
            content: result.text,
            prompt: input.customPrompt,
            includeMermaid: input.includeMermaid ?? false,
            model: result.model,
            updatedAt: new Date(),
          },
        });

        return {
          content: result.text,
          provider: result.provider,
          model: result.model,
          saved: savedReadme,
        };
      });
    }),

  // Generate mermaid diagram
  generateMermaid: privateProcedure
    .input(
      z.object({
        projectId: z.string(),
        diagramType: z.enum(["architecture", "flow", "sequence", "class"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      // Check access
      const userProject = await ctx.db.userToProject.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: input.projectId,
          },
        },
      });

      if (!userProject) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to this project",
        });
      }

      // Get user's API keys
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
      const preferredProvider = userPref?.preferredProvider ?? undefined;

      // Build context
      const contextParts = project.sourceCodeEmbeddings.map(
        (embedding) => `--- ${embedding.fileName} ---\n${embedding.summary}\n`
      );
      const context = contextParts.join("\n");

      const result = await generateMermaidDiagram(
        context,
        project.name,
        input.diagramType ?? "architecture",
        {
          userApiKeys: apiKeyMap,
          preferredProvider,
          strictProvider: false,
        }
      );

      return {
        diagram: result.text,
        provider: result.provider,
        model: result.model,
      };
    }),

  // Delete README
  delete: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.generatedReadme.delete({
        where: {
          userId_projectId: {
            userId: ctx.user.userId,
            projectId: input.projectId,
          },
        },
      });
      return { success: true };
    }),
});
