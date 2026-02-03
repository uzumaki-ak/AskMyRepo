// import 'dotenv/config'
import 'dotenv/config'
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Document } from "@langchain/core/documents";

// Initialize outside the function so it's reused across calls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const textModelName =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
const textModel = genAI.getGenerativeModel({
  model: textModelName,
});

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




export async function summariseCode(doc: Document) {
  console.log("gettin summary for", doc.metadata.source);
  try {
    const code = doc.pageContent.slice(0, 10000);
  const response = await textModel.generateContent([
    `you are an intelligent senior software engineer who specializes in onboarding junior software engineeers onto projects`,
    `you are onboarding a junior software engineer and explaining to them the purpose of the
     ${doc.metadata.source} file
     Here is the code: 

     ----
     ${code}
     ----
     Give a summary no more tyhan 100 words of the code above`,
  ]);

  return response.response.text();
  } catch (error) {
    return ''
  }
  
}

export async function generateEmbedding(summary: string) {
  const model = genAI.getGenerativeModel({
    model: "text-embedding-004"
  });
  const result = await model.embedContent(summary);
  const embedding = result.embedding;
  return embedding.values;
}

// console.log(await generateEmbedding("hey"));
