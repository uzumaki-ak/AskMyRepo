'use server'
import { createStreamableValue } from 'ai/rsc'
import { auth } from '@clerk/nextjs/server'
import {
  generateEmbedding,
  normalizeEmbeddingProvider,
  type EmbeddingProvider,
  type EmbeddingResult,
} from '~/lib/gemini'
import { generateCompletion } from '~/lib/llm-service'
import { db } from '~/server/db'

export async function askQuestion(question: string, projectID:string){
const stream = createStreamableValue()

const { userId } = await auth()
let preferredProvider: string | null = null
const userApiKeys: Record<string, string> = {}
if (userId) {
  const [user, keys] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { preferredProvider: true },
    }),
    db.userApiKey.findMany({
      where: { userId, isActive: true },
      select: { provider: true, apiKey: true },
    }),
  ])
  preferredProvider = user?.preferredProvider ?? null
  for (const key of keys) {
    userApiKeys[key.provider] = key.apiKey
  }
}

const rawProvider =
  preferredProvider ?? process.env.EMBEDDING_PROVIDER ?? ""
const embeddingProvider = normalizeEmbeddingProvider(rawProvider)
const embeddingApiKey = embeddingProvider
  ? userApiKeys[embeddingProvider]
  : undefined
const embeddingOptions =
  embeddingProvider
    ? { provider: embeddingProvider as EmbeddingProvider, apiKey: embeddingApiKey }
    : {}
const embeddingResult: EmbeddingResult | null = await generateEmbedding(
  question,
  embeddingOptions,
)
let result: {fileName: string, sourceCode: string, summary: string, similarity: number}[] = []
if (embeddingResult?.embedding?.length) {
  // Log the embedding details for debugging
  console.log(`Query embedding: provider=${embeddingResult.provider}, model=${embeddingResult.model}, dimension=${embeddingResult.dimension}`)
  const vectorQuery = `[${embeddingResult.embedding.join(',')}]`
  try {
    result = await db.$queryRaw`
    SELECT "fileName", "sourceCode", "summary", 
    1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) as similarity
    FROM "SourceCodeEmbedding"
    WHERE "summaryEmbedding" IS NOT NULL
    AND "projectId" = ${projectID}
    AND vector_dims("summaryEmbedding") = ${embeddingResult.dimension}
    ORDER BY "summaryEmbedding" <=> ${vectorQuery}::vector
    LIMIT 10
    ` as {fileName: string, sourceCode: string, summary: string, similarity: number}[]
  } catch (error) {
    console.error("Vector search failed, falling back to keyword search:", error)
  }
} else {
  console.warn("Embedding unavailable; falling back to keyword search.")
}

  const stopwords = new Set([
    "the","is","a","an","and","or","to","of","in","on","for","with","where",
    "what","which","how","why","when","i","me","my","we","you","your","our",
    "file","files","code","repo","project","change","edit","update","page",
  ])
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9_./-]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopwords.has(t))
    .slice(0, 8)

  const maxSim =
    result.length > 0 ? Math.max(...result.map((r) => r.similarity)) : 0
  const shouldFallback = result.length === 0 || maxSim < 0.3
  if (shouldFallback) {
    if (tokens.length > 0) {
      const orClauses = tokens.flatMap((token) => [
        { fileName: { contains: token, mode: "insensitive" as const } },
        { sourceCode: { contains: token, mode: "insensitive" as const } },
      ])
      const keywordMatches = await db.sourceCodeEmbedding.findMany({
        where: {
          projectId: projectID,
          OR: orClauses,
        },
        take: 10,
        select: { fileName: true, sourceCode: true, summary: true },
      })
      if (keywordMatches.length > 0) {
        result = keywordMatches.map((item) => ({
          ...item,
          similarity: 1,
        }))
      }
    }
  }

  const allowNoiseTokens = new Set([
    "readme","package","lock","next","eslint","tsconfig","gitignore","config",
  ])
  const isNoiseFile = (fileName: string) => {
    const lower = fileName.toLowerCase()
    return (
      lower === ".gitignore" ||
      lower === "readme.md" ||
      lower === "package.json" ||
      lower === "package-lock.json" ||
      lower === "pnpm-lock.yaml" ||
      lower === "yarn.lock" ||
      lower.startsWith("next.config.") ||
      lower.startsWith("eslint.config.") ||
      lower === "tsconfig.json"
    )
  }

  const scored = result.map((doc) => {
    const fileLower = doc.fileName.toLowerCase()
    const srcLower = doc.sourceCode.toLowerCase()
    let fileHits = 0
    let srcHits = 0
    for (const token of tokens) {
      if (fileLower.includes(token)) fileHits += 1
      if (srcLower.includes(token)) srcHits += 1
    }
    const score = doc.similarity + fileHits * 0.2 + srcHits * 0.05
    return { ...doc, score, fileHits, srcHits }
  })

  const filtered = scored.filter((doc) => {
    const hasTokens = tokens.length > 0
    const isNoise = isNoiseFile(doc.fileName)
    const allowNoise = tokens.some((t) => allowNoiseTokens.has(t))
    if (isNoise && !allowNoise) return false
    if (!hasTokens) return true
    return doc.fileHits + doc.srcHits > 0 || doc.similarity >= 0.45
  })

  const finalResults = (filtered.length > 0 ? filtered : scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score, fileHits, srcHits, ...doc }) => doc)

  result = finalResults
  if (result.length === 0) {
    stream.update("No relevant files were found in the indexed source code.")
    stream.done()
    return { output: stream.value, filesRefrences: [] }
  }
let context = ''
for (const doc of result){
  context += `source: ${doc.fileName}\ncode content: ${doc.sourceCode}\n summary of file: ${doc.summary}\n\n`
}

  const buildFallbackAnswer = () => {
    const lines: string[] = []
    for (const doc of result.slice(0, 3)) {
      const srcLines = doc.sourceCode.split("\n")
      for (const line of srcLines) {
        if (tokens.some((t) => line.toLowerCase().includes(t))) {
          lines.push(`${doc.fileName}: ${line.trim()}`)
        }
        if (lines.length >= 6) break
      }
      if (lines.length >= 6) break
    }
    if (lines.length > 0) {
      return `I couldn't generate an AI answer, but these lines match your question:\n\n${lines
        .map((l) => `- ${l}`)
        .join("\n")}\n\nRelevant files: ${result
        .map((r) => r.fileName)
        .join(", ")}`
    }
    return `I couldn't generate an AI answer. Relevant files:\n${result
      .map((r) => `- ${r.fileName}`)
      .join("\n")}`
  }

  try {
    const completion = await generateCompletion(
      `
You are a codebase assistant. Answer the question using only the context below.
If the answer is not in the context, reply: "I don't know based on the indexed files."
Be concise, technical, and direct. Cite file paths when relevant.

CONTEXT:
${context}

QUESTION:
${question}

Answer in markdown. Use short code snippets only when they clarify the answer.
    `,
      {
        maxTokens: 1200,
        temperature: 0.2,
        userApiKeys,
        preferredProvider: preferredProvider ?? undefined,
        strictProvider: false,
      },
    )
    stream.update(completion.text || buildFallbackAnswer())
  } catch (err) {
    console.error("AI answer failed", err)
    stream.update(buildFallbackAnswer())
  }
  stream.done()
return {
  output: stream.value,
  filesRefrences: result
}
}
