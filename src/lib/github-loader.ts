import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github'
import { Document } from '@langchain/core/documents'
import {
  generateEmbedding,
  summariseCode,
  type EmbeddingProvider,
  normalizeEmbeddingProvider,
} from './gemini'
import { db } from '~/server/db'


export const loadGithubRepo = async(githubUrl: string, githubToken?:string) => {
const loader = new GithubRepoLoader(githubUrl, {
  accessToken: githubToken || process.env.GITHUB_TOKEN || '',
  ignoreFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
  recursive: true,
  unknown: 'warn',
  maxConcurrency: 5,

})

const docs = await loader.load()
return docs
}


type IndexOptions = {
  resume?: boolean
  userApiKeys?: Record<string, string>
  preferredProvider?: string
  preferredModel?: string
}

export const indexGithubRepo = async(
  projectId: string,
  githubUrl: string,
  githubToken?: string,
  options: IndexOptions = {},
) => {
  const docs  = await loadGithubRepo(githubUrl, githubToken)
  const totalFiles = docs.length
  await db.project.update({
    where: { id: projectId },
    data: {
      embeddingStatus: "indexing",
      embeddingTotal: totalFiles,
      embeddingLastError: null,
      embeddingLastAttemptAt: new Date(),
    },
  })

  // Clean up any rows that never got embeddings (from older runs).
  await db.$executeRaw`
    DELETE FROM "SourceCodeEmbedding"
    WHERE "projectId" = ${projectId}
    AND "summaryEmbedding" IS NULL
  `

  let existingFileNames = new Set<string>()
  if (options.resume) {
    const existing = await db.sourceCodeEmbedding.findMany({
      where: { projectId },
      select: { fileName: true },
    })
    existingFileNames = new Set(existing.map((item) => item.fileName))
  } else {
    await db.sourceCodeEmbedding.deleteMany({ where: { projectId } })
  }

  const docsToIndex = docs.filter((doc) => {
    return !existingFileNames.has(doc.metadata.source)
  })

  const allEmbeddings = await generateEmbeddings(docsToIndex, {
    userApiKeys: options.userApiKeys,
    preferredProvider: options.preferredProvider,
    preferredModel: options.preferredModel,
  })
  const safeEmbeddings = allEmbeddings.filter((embedding) => {
    return embedding?.embedding?.length
  })
  const attemptedCount = docsToIndex.length
  const successCount = safeEmbeddings.length
  const failedCount = Math.max(0, attemptedCount - successCount)

  let indexedCount = existingFileNames.size
  await db.project.update({
    where: { id: projectId },
    data: { embeddingIndexed: indexedCount },
  })

  const batchSize = 3
  for (let start = 0; start < safeEmbeddings.length; start += batchSize) {
    const batch = safeEmbeddings.slice(start, start + batchSize)
    const results = await Promise.allSettled(
      batch.map(async (embedding, index) => {
        const current = start + index + 1
        console.log(`processing ${current} of ${safeEmbeddings.length}`)
        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
          data: {
            summary: embedding!.summary,
            sourceCode: embedding!.sourceCode,
            fileName: embedding!.fileName,
            projectId,
          },
        })

        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding!.embedding}::vector
        WHERE "id" = ${sourceCodeEmbedding.id}
        `
      }),
    )
    indexedCount += results.filter((res) => res.status === "fulfilled").length
    await db.project.update({
      where: { id: projectId },
      data: { embeddingIndexed: indexedCount },
    })
  }

  const finalCount = await db.sourceCodeEmbedding.count({
    where: { projectId },
  })
  const status =
    finalCount >= totalFiles
      ? "complete"
      : finalCount > 0
        ? "partial"
        : "failed"
  const lastError =
    status === "partial"
      ? `${failedCount} files failed to embed. Reindex to retry.`
      : status === "failed"
        ? "No embeddings were generated. Check API key/model."
        : null

  await db.project.update({
    where: { id: projectId },
    data: {
      embeddingIndexed: finalCount,
      embeddingStatus: status,
      embeddingLastError: lastError,
    },
  })
}

type EmbeddingResult = {
  summary: string
  embedding: number[]
  sourceCode: string
  fileName: string
} | null

const buildFallbackSummary = (doc: Document, code: string) => {
  const fileName = doc.metadata?.source ?? "unknown file"
  const lineCount = code ? code.split("\n").length : 0
  return `Summary unavailable for ${fileName}. File has ~${lineCount} lines of code.`
}

const generateEmbeddings = async(
  docs: Document[],
  options: {
    userApiKeys?: Record<string, string>
    preferredProvider?: string
    preferredModel?: string
  } = {},
): Promise<EmbeddingResult[]> => {
  return await Promise.all(docs.map(async doc => {
    const code = String(doc.pageContent ?? "")
    let summary = await summariseCode(doc, {
      userApiKeys: options.userApiKeys,
      preferredProvider: options.preferredProvider,
      preferredModel: options.preferredModel,
    })
    let embeddingInput = summary
    if (!summary.trim()) {
      console.warn(
        `summary empty for ${doc.metadata.source}, using code excerpt for embedding`,
      )
      summary = buildFallbackSummary(doc, code)
      embeddingInput = code.slice(0, 4000)
    }
    const rawProvider =
      options.preferredProvider ?? process.env.EMBEDDING_PROVIDER ?? ""
    const embeddingProvider = normalizeEmbeddingProvider(rawProvider)
    const embeddingApiKey = embeddingProvider
      ? options.userApiKeys?.[embeddingProvider]
      : undefined
    const embeddingOptions =
      embeddingProvider
        ? { provider: embeddingProvider as EmbeddingProvider, apiKey: embeddingApiKey }
        : {}
    const embeddingResult = await generateEmbedding(embeddingInput, embeddingOptions)
    if (!embeddingResult?.embedding?.length) {
      console.warn(`embedding failed for ${doc.metadata.source}`)
      return null
    }
    return {
      summary,
      embedding: embeddingResult.embedding,
      sourceCode: JSON.parse(JSON.stringify(doc.pageContent ?? "")),
      fileName: doc.metadata.source,
    }
  }))
}





// the work of this file is it will take giturl and return all files in repo using langchain
// this is what we get 
// console.log(await loadGithubRepo('https://github.com/uzumaki-ak/fronted-for-traffic'));


// Document {
//   pageContent: 'import { ClassValue, clsx } from "clsx";\n' +
//     'import { twMerge } from "tailwind-merge";\n' +
//     '\n' +
//     'export function cn(...inputs: ClassValue[]) {\n' +
//     '  return twMerge(clsx(inputs));\n' +
//     '}\n',
//   metadata: {
//     source: 'src/lib/utils.ts',
//     repository: 'https://github.com/uzumaki-ak/fronted-for-traffic',
//     branch: 'main'
//   },
//   id: undefined
// }
// ]
