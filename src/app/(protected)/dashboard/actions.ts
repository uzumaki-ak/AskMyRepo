'use server'
import { generateText } from 'ai'
import {createStreamableValue} from 'ai/rsc'
import {createGoogleGenerativeAI} from '@ai-sdk/google'
import { generateEmbedding } from '~/lib/gemini'
import { db } from '~/server/db'

const google  = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function askQuestion(question: string, projectID:string){
const stream = createStreamableValue()

const queryVector = await generateEmbedding(question)
const vectorQuery = `[${queryVector.join(',')}]`

let result = await db.$queryRaw`
SELECT "fileName", "sourceCode", "summary", 
1 - ("summaryEmbedding" <=> ${vectorQuery}::vector) as similarity
FROM "SourceCodeEmbedding"
WHERE "summaryEmbedding" IS NOT NULL
AND "projectId" = ${projectID}
ORDER BY "summaryEmbedding" <=> ${vectorQuery}::vector
LIMIT 10
` as {fileName: string, sourceCode: string, summary: string, similarity: number}[]

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
    const { text } = await generateText({
      model: google(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
      prompt: `
You are a ai code assistant who answers questions about the codebase. Your target audience is a technical intern who is new to the codebase. 
AI assistant is a brand new, powerful, human-like artificial intelligence. 
The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness. 
AI is a well-behaved and well-mannered individual. 
AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user. 
AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in code. 
If the question is asking about code or a specific file, AI will provide the detailed answer, giving step by step instructions.

START CONTEXT BLOCK  
${context}  
END OF CONTEXT BLOCK  

START QUESTION  
${question}  
END OF QUESTION  

AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.  
If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer based on the provided context."  
AI assistant will not apologize for previous responses, but instead will indicated new information was gained.  
AI assistant will not invent anything that is not drawn directly from the context.  
Answer in markdown syntax, with code snippets if needed. Be as detailed as possible when answering, make sure there is no ambiguity.
    `,
    })
    stream.update(text || buildFallbackAnswer())
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
