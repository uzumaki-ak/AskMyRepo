import { encrypt } from "~/lib/encryption";
import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { LLM_PROVIDERS } from "~/lib/llm-service";

const validProviders = [...Object.keys(LLM_PROVIDERS), "github"];

export const apiKeysRouter = createTRPCRouter({
  // Get all user's API keys (masked)
  list: privateProcedure.query(async ({ ctx }) => {
    const keys = await ctx.db.userApiKey.findMany({
      where: { userId: ctx.user.userId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't return the actual API key
      },
    });
    return keys;
  }),

  // Get available providers with their info
  getProviders: privateProcedure.query(() => {
    const providers = Object.entries(LLM_PROVIDERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      models: config.models,
      maxTokens: config.maxTokens,
      rateLimit: config.rateLimit,
      apiKeyEnv: config.apiKeyEnv,
      supportsEmbeddings: !!config.supportsEmbeddings,
    }));
    
    // Add GitHub manually since it's not in LLM_PROVIDERS
    providers.push({
      id: "github",
      name: "GitHub",
      models: ["Git Push / Commit"],
      maxTokens: 0,
      rateLimit: 5000,
      apiKeyEnv: "GITHUB_TOKEN",
      supportsEmbeddings: false,
    });
    
    return providers;
  }),

  // Add or update an API key
  set: privateProcedure
    .input(
      z.object({
        provider: z.string().refine((val) => validProviders.includes(val), {
          message: "Invalid provider",
        }),
        apiKey: z.string().min(1, "API key is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const encryptedKey = encrypt(input.apiKey);
      
      // Upsert the API key
      const existingKey = await ctx.db.userApiKey.findUnique({
        where: {
          userId_provider: {
            userId: ctx.user.userId,
            provider: input.provider,
          },
        },
      });

      if (existingKey) {
        // Update existing key
        return ctx.db.userApiKey.update({
          where: { id: existingKey.id },
          data: { apiKey: encryptedKey, isActive: true },
        });
      }

      // Create new key
      return ctx.db.userApiKey.create({
        data: {
          userId: ctx.user.userId,
          provider: input.provider,
          apiKey: encryptedKey,
          isActive: true,
        },
      });
    }),

  // Toggle API key active status
  toggle: privateProcedure
    .input(
      z.object({
        provider: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userApiKey.update({
        where: {
          userId_provider: {
            userId: ctx.user.userId,
            provider: input.provider,
          },
        },
        data: { isActive: input.isActive },
      });
    }),

  // Delete an API key
  delete: privateProcedure
    .input(
      z.object({
        provider: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userApiKey.delete({
        where: {
          userId_provider: {
            userId: ctx.user.userId,
            provider: input.provider,
          },
        },
      });
      return { success: true };
    }),

  // Check which providers have keys configured (user or env)
  checkConfigured: privateProcedure.query(async ({ ctx }) => {
    const userKeys = await ctx.db.userApiKey.findMany({
      where: { userId: ctx.user.userId },
      select: { provider: true },
    });

    const userProviderSet = new Set(userKeys.map((k) => k.provider));

    return Object.keys(LLM_PROVIDERS).map((provider) => ({
      provider,
      hasUserKey: userProviderSet.has(provider),
      hasEnvKey: !!process.env[LLM_PROVIDERS[provider]!.apiKeyEnv],
    }));
  }),

  // Get user's preferred provider (for chat + embeddings)
  getPreference: privateProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.userId },
      select: { preferredProvider: true },
    });
    return { preferredProvider: user?.preferredProvider ?? null };
  }),

  // Set user's preferred provider (or clear it)
  setPreference: privateProcedure
    .input(
      z.object({
        provider: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.provider && !validProviders.includes(input.provider)) {
        throw new Error("Invalid provider");
      }
      if (
        input.provider &&
        input.provider !== "github" &&
        !LLM_PROVIDERS[input.provider]?.supportsEmbeddings
      ) {
        throw new Error("Provider does not support embeddings in this app");
      }
      await ctx.db.user.upsert({
        where: { id: ctx.user.userId },
        update: { preferredProvider: input.provider },
        create: { id: ctx.user.userId, preferredProvider: input.provider },
      });
      return { preferredProvider: input.provider };
    }),
});
