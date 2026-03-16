import { z } from "zod";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { generateCompletion } from "~/lib/llm-service";
import { TRPCError } from "@trpc/server";

export const interviewRouter = createTRPCRouter({
  generateQuestions: privateProcedure
    .input(z.object({ 
      projectId: z.string(),
      customPrompt: z.string().optional()
    }))
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

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const context = project.sourceCodeEmbeddings
        .map((e) => `File: ${e.fileName}\nSummary: ${e.summary}`)
        .join("\n\n");

      const systemPrompt = `
        You are a Senior Technical Interviewer. Analyze the following project context and generate 5 to 10 challenging technical interview questions with their correct answers.
        
        PROJECT: ${project.name}
        USER REQUEST: ${input.customPrompt || "General architecture and logic review."}
        
        CONTEXT:
        ${context}
        
        REQUIREMENTS:
        1. Questions must be specific to this codebase.
        2. Provide Question AND a detailed Answer.
        3. Return as a JSON array of objects: [{"question": "...", "answer": "..."}]
        
        If the USER REQUEST is specific, prioritize questions related to that request.
      `;

      // Get user API keys
      const userApiKeys = await ctx.db.userApiKey.findMany({
        where: { userId: ctx.user.userId, isActive: true },
      });
      const apiKeyMap: Record<string, string> = {};
      for (const key of userApiKeys) apiKeyMap[key.provider] = key.apiKey;
      const userPref = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId },
        select: { preferredProvider: true },
      });

      const result = await generateCompletion(systemPrompt, {
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
        strictProvider: false,
      });

      try {
        let cleanedText = result.text.trim();
        const jsonStart = cleanedText.indexOf("[");
        const jsonEnd = cleanedText.lastIndexOf("]");
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
        }

        console.log("LLM Content to Parse:", cleanedText);
        const questionPairs = JSON.parse(cleanedText) as { question: string, answer: string }[];
        
        await ctx.db.interviewQuestionSet.create({
            data: {
                projectId: input.projectId,
                userId: ctx.user.userId,
                questions: questionPairs as any,
            }
        });

        return questionPairs;
      } catch (error) {
        console.error("❌ Interview generation parsing error:", error);
        console.error("Raw LLM Text:", result.text);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate structured questions.",
        });
      }
    }),

  askDoubt: privateProcedure
    .input(z.object({
      projectId: z.string(),
      question: z.string(),
      answer: z.string(),
      userDoubt: z.string(),
    }))
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

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      const projectContext = project.sourceCodeEmbeddings
        .map((e) => `File: ${e.fileName}\nSummary: ${e.summary}`)
        .join("\n\n");
      
      console.log(`🔍 Providing context for ${project.sourceCodeEmbeddings.length} files to AI for project: ${project.name}`);

      const systemPrompt = `
        You are a **Senior Technical Architect and Elite Mentor**. 
        You are assisting a developer in a HIGH-PRESSURE interview prep session for their project: ***${project.name}***.
        
        **PROJECT CONTEXT (TRUST THIS OVER HALLUCINATIONS):**
        ${projectContext}

        **CURRENT INTERVIEW STAGE:**
        - **Question being discussed:** "${input.question}"
        - **Model Solution provided:** "${input.answer}"
        
        **USER'S SPECIFIC DOUBT:**
        > "${input.userDoubt}"
        
        **STRICT INSTRUCTIONS FOR YOUR RESPONSE:**
        1. **Roleplay:** Act as a wise, encouraging, but highly technical mentor.
        2. **STYLING:** Use rich Markdown. Use ***bold italics*** for emphasis. Use **bold** for key terms. Use \`code snippets\` for variable names. 
        3. **Visual Structure:** Use clear sections with headers like ### 💡 The Concept or ### 🛠️ Implementation Detail.
        4. **Code Evidence:** You MUST reference specific files from the context above. If the context doesn't have the file, acknowledge that "based on the available architecture summaries," you are guiding them.
        5. **No Hallucinations:** Do NOT mention other projects (like "Pinnacle"). This project is specifically **${project.name}**.
        6. **Clarity:** Ensure your answer is deep but easy to scan. Use bullet points and horizontal rules (---) to separate thoughts.
        7. **Confidence:** Never say "I don't have access." You have the architectural summaries above. Use them to infer the logic.
        
        Provide the response in a **PREMIUM, VISUALLY STUNNING** format now:
      `;

      // Get user API keys
      const userApiKeys = await ctx.db.userApiKey.findMany({
        where: { userId: ctx.user.userId, isActive: true },
      });
      const apiKeyMap: Record<string, string> = {};
      for (const key of userApiKeys) apiKeyMap[key.provider] = key.apiKey;
      const userPref = await ctx.db.user.findUnique({
        where: { id: ctx.user.userId },
        select: { preferredProvider: true },
      });

      const result = await generateCompletion(systemPrompt, {
        userApiKeys: apiKeyMap,
        preferredProvider: userPref?.preferredProvider ?? undefined,
        strictProvider: false,
      });

      return result.text;
    }),

  getHistory: privateProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.interviewQuestionSet.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
        take: 10
      });
    }),
});
