// import 'dotenv/config'
import 'dotenv/config'
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Document } from "@langchain/core/documents";
import { generateCompletion } from "./llm-service";

// Initialize outside the function so it's reused across calls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const textModelName =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
const textModel = genAI.getGenerativeModel({
  model: textModelName,
});
const embeddingModelName =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const euronEmbeddingModel =
  process.env.EURON_EMBEDDING_MODEL || "text-embedding-3-small";
const euronEmbeddingUrl =
  process.env.EURON_EMBEDDING_URL || "https://api.euron.one/api/v1/euri/embeddings";
const openrouterEmbeddingModel =
  process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
const openrouterEmbeddingUrl =
  process.env.OPENROUTER_EMBEDDING_URL || "https://openrouter.ai/api/v1/embeddings";
const openrouterEmbeddingDimensions = Number.parseInt(
  process.env.OPENROUTER_EMBEDDING_DIMENSIONS ?? "",
  10,
);

const getGeminiClient = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY || "";
  if (!key) return null;
  return apiKey ? new GoogleGenerativeAI(apiKey) : genAI;
};

export const aiSummariseCommit = async (diff: string): Promise<string> => {
  if (!diff.trim()) {
    return "No diff provided";
  }

  try {
    const prompt = [
      `You are an expert programmer, and you are trying to summarize a git diff.
      
      Reminders about the git diff format:
      - For every file, there are a few metadata lines, like:
        \`diff --git a/lib/index.js b/lib/index.js\`
        \`index aadf691..bfef603 100644\`
        This means that 'lib/index.js' was modified in this commit. This is just an example.
      - A line starting with '+' means it was added.
      - A line starting with '-' means it was deleted.
      - A line starting with neither '+' nor '-' is provided for context and is not part of the actual diff.
      
      Example summary comments:
      - Raised the amount of returned recordings from 10 to 100 [packages/server/recordings_api.ts].
      - Fixed a typo in the GitHub action name [.github/workflows/gpt-commit-summarizer.yml].
      - Moved the octokit initialization to a separate file [src/octokit.ts, src/index.ts].
      - Added an OpenAI API for completions [packages/utils/apis/openai.ts].
      - Lowered numeric tolerance for test files.

      -Most commits will have less comments than this example list.
      -the last commment does not include the file names,
      -because there were more than two relevant files in hypothetical commit
      -Do not include parts of the example in your summary.
      -The example is given only to illustrate appropriate comments.
      `,
      `Please summarize the following diff file: \n\n${diff}`,
    ];

    const result = await textModel.generateContent(prompt);
    return result.response.text(); 
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return "Failed to generate summary";
  }
};




export async function summariseCode(
  doc: Document,
  options: {
    userApiKeys?: Record<string, string>;
    preferredProvider?: string;
    preferredModel?: string;
  } = {},
) {
  console.log("getting summary for", doc.metadata.source);
  try {
    const code = String(doc.pageContent ?? "").slice(0, 8000);
    const prompt = [
      "You are a senior software engineer summarizing a single file for onboarding.",
      `File: ${doc.metadata.source}`,
      "Summarize the file in 3-5 sentences.",
      "Rules:",
      "Do not include code or code fences.",
      "Do not list line-by-line details.",
      "Focus on purpose, key responsibilities, and important interactions.",
      "",
      "Code:",
      "----",
      code,
      "----",
    ].join("\n");

    const result = await generateCompletion(prompt, {
      maxTokens: 200,
      temperature: 0.2,
      userApiKeys: options.userApiKeys,
      preferredProvider: options.preferredProvider,
      preferredModel: options.preferredModel,
      strictProvider: Boolean(options.preferredProvider),
    });

    const summary = cleanSummary(result.text);
    return summary;
  } catch (error) {
    return "";
  }
}

const looksLikeCode = (text: string) => {
  if (!text) return false;
  const lines = text.split("\n");
  const codeLike = lines.filter((line) =>
    /(^\s*(import|export|const|let|var|function|class|interface|type)\b)|[;{}]/.test(
      line,
    ),
  ).length;
  const ratio = lines.length > 0 ? codeLike / lines.length : 0;
  return codeLike >= 3 || ratio >= 0.4;
};

const cleanSummary = (text: string) => {
  let cleaned = text.replace(/```[\s\S]*?```/g, "").trim();
  if (!cleaned) return "";
  if (cleaned.length > 1200) return "";
  if (looksLikeCode(cleaned)) return "";
  return cleaned;
};

export type EmbeddingProvider = "google" | "euron" | "openrouter";
export type EmbeddingResult = {
  embedding: number[];
  provider: EmbeddingProvider;
  model: string;
  dimension: number;
};

type EmbeddingOptions = {
  provider?: EmbeddingProvider | string;
  model?: string;
  apiKey?: string;
};

export const normalizeEmbeddingProvider = (
  provider?: string | null,
): EmbeddingProvider | undefined => {
  if (!provider) return undefined;
  if (provider === "gemini") return "google";
  if (provider === "google" || provider === "euron" || provider === "openrouter") {
    return provider;
  }
  return undefined;
};

const tryGeminiEmbedding = async (
  summary: string,
  modelName: string,
  apiKey?: string,
): Promise<{ embedding: number[]; modelUsed: string } | null> => {
  const client = getGeminiClient(apiKey);
  if (!client) {
    console.error("Gemini embedding skipped: missing GEMINI_API_KEY");
    return null;
  }
  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.embedContent(summary);
    return { embedding: result.embedding.values, modelUsed: modelName };
  } catch (error) {
    console.error(`Embedding failed for ${modelName}:`, error);
  }

  if (!modelName.startsWith("models/")) {
    try {
      const prefixed = `models/${modelName}`;
      const model = client.getGenerativeModel({ model: prefixed });
      const result = await model.embedContent(summary);
      return { embedding: result.embedding.values, modelUsed: prefixed };
    } catch (prefixError) {
      console.error(`Embedding failed for models/${modelName}:`, prefixError);
    }
  }

  return null;
};

const tryEuronEmbedding = async (
  summary: string,
  modelName: string,
  apiKey?: string,
): Promise<number[] | null> => {
  const euronKey = apiKey || process.env.EURON_API_KEY;
  if (!euronKey) {
    console.error("Euron embedding skipped: missing EURON_API_KEY");
    return null;
  }
  try {
    console.log(`Falling back to Euron embeddings (${modelName})`);
    const response = await fetch(euronEmbeddingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${euronKey}`,
      },
      body: JSON.stringify({
        input: summary,
        model: modelName,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Euron embedding failed:", response.status, text);
      return null;
    }
    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      console.error("Euron embedding missing in response");
      return null;
    }
    return embedding as number[];
  } catch (euronError) {
    console.error("Euron embedding request failed:", euronError);
    return null;
  }
};

const tryOpenRouterEmbedding = async (
  summary: string,
  modelName: string,
  apiKey?: string,
): Promise<number[] | null> => {
  const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    console.error("OpenRouter embedding skipped: missing OPENROUTER_API_KEY");
    return null;
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openrouterKey}`,
    };
    if (process.env.OPENROUTER_HTTP_REFERER) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_HTTP_REFERER;
    }
    if (process.env.OPENROUTER_X_TITLE) {
      headers["X-Title"] = process.env.OPENROUTER_X_TITLE;
    }
    const payload: Record<string, unknown> = {
      input: summary,
      model: modelName,
    };
    if (Number.isFinite(openrouterEmbeddingDimensions) && openrouterEmbeddingDimensions > 0) {
      payload.dimensions = openrouterEmbeddingDimensions;
    }
    const response = await fetch(openrouterEmbeddingUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter embedding failed:", response.status, text);
      return null;
    }
    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      console.error("OpenRouter embedding missing in response");
      return null;
    }
    return embedding as number[];
  } catch (openrouterError) {
    console.error("OpenRouter embedding request failed:", openrouterError);
    return null;
  }
};

export async function generateEmbedding(
  summary: string,
  options: EmbeddingOptions = {},
): Promise<EmbeddingResult | null> {
  if (!summary.trim()) {
    return null;
  }
  const normalizedProvider = normalizeEmbeddingProvider(options.provider);
  if (normalizedProvider === "google") {
    const modelName = options.model || embeddingModelName;
    const gemini = await tryGeminiEmbedding(summary, modelName, options.apiKey);
    if (!gemini?.embedding?.length) return null;
    return {
      embedding: gemini.embedding,
      provider: "google",
      model: gemini.modelUsed,
      dimension: gemini.embedding.length,
    };
  }

  if (normalizedProvider === "euron") {
    const modelName = options.model || euronEmbeddingModel;
    const embedding = await tryEuronEmbedding(
      summary,
      modelName,
      options.apiKey,
    );
    if (!embedding?.length) return null;
    return {
      embedding,
      provider: "euron",
      model: modelName,
      dimension: embedding.length,
    };
  }

  if (normalizedProvider === "openrouter") {
    const modelName = options.model || openrouterEmbeddingModel;
    const embedding = await tryOpenRouterEmbedding(
      summary,
      modelName,
      options.apiKey,
    );
    if (!embedding?.length) return null;
    return {
      embedding,
      provider: "openrouter",
      model: modelName,
      dimension: embedding.length,
    };
  }

  const gemini = await tryGeminiEmbedding(
    summary,
    embeddingModelName,
    options.apiKey,
  );
  if (gemini?.embedding?.length) {
    return {
      embedding: gemini.embedding,
      provider: "google",
      model: gemini.modelUsed,
      dimension: gemini.embedding.length,
    };
  }

  const euron = await tryEuronEmbedding(
    summary,
    euronEmbeddingModel,
    options.apiKey,
  );
  if (euron?.length) {
    return {
      embedding: euron,
      provider: "euron",
      model: euronEmbeddingModel,
      dimension: euron.length,
    };
  }

  return null;
}

// console.log(await generateEmbedding("hey"));
