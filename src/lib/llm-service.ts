// Multi-provider LLM service with automatic fallback
// Supports: Groq, Google (Gemini), Euron, OpenRouter, Mistral, OpenAI

export interface LLMProvider {
  name: string;
  baseUrl: string | null;
  apiKeyEnv: string;
  models: string[];
  maxTokens: number;
  rateLimit: number; // requests per day/minute depending on provider
  supportsEmbeddings?: boolean;
}

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}

// LLM Configuration with API endpoints
export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    maxTokens: 8000,
    rateLimit: 14400, // per day
    supportsEmbeddings: false,
  },
  google: {
    name: "Google AI Studio",
    baseUrl: null, // Uses google-generativeai library
    apiKeyEnv: "GEMINI_API_KEY",
    models: ["gemini-2.5-flash", "gemini-1.5-pro"],
    maxTokens: 8192,
    rateLimit: 60000, // per minute
    supportsEmbeddings: true,
  },
  euron: {
    name: "Euron.one",
    baseUrl: "https://api.euron.one/api/v1/euri",
    apiKeyEnv: "EURON_API_KEY",
    models: ["gpt-4.1-nano", "gpt-4o-mini"],
    maxTokens: 4096,
    rateLimit: 10000,
    supportsEmbeddings: true,
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    models: [
      "meta-llama/llama-3.1-8b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
    ],
    maxTokens: 4096,
    rateLimit: 200,
    supportsEmbeddings: true,
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    models: ["mistral-small-latest", "mistral-tiny"],
    maxTokens: 8000,
    rateLimit: 1000000000, // 1B tokens/month
    supportsEmbeddings: false,
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    models: ["gpt-4o-mini", "gpt-4o"],
    maxTokens: 4096,
    rateLimit: 500, // varies by tier
    supportsEmbeddings: false,
  },
};

// Priority order for fallback
const PROVIDER_PRIORITY = ["groq", "google", "euron", "openrouter", "mistral", "openai"];

export const EMBEDDING_PROVIDERS = ["google", "euron", "openrouter"] as const;
export type EmbeddingCapableProvider = (typeof EMBEDDING_PROVIDERS)[number];

// Get API key from environment or user's stored keys
function getApiKey(provider: string, userApiKeys?: Record<string, string>): string | null {
  const providerConfig = LLM_PROVIDERS[provider];
  if (!providerConfig) return null;

  // First check user's stored API keys
  if (userApiKeys?.[provider]) {
    return userApiKeys[provider];
  }

  // Then check environment variables
  return process.env[providerConfig.apiKeyEnv] || null;
}

// OpenAI-compatible API call (used by Groq, Euron, OpenRouter, Mistral, OpenAI)
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature: number = 0.7
): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${baseUrl} error:`, response.status, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error(`❌ ${baseUrl} fetch failed:`, error);
    return null;
  }
}

// Google Gemini API call
async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number = 0.7
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini (${model}) error:`, response.status, errorText.substring(0, 200));
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error(`❌ Gemini fetch failed:`, error);
    return null;
  }
}

// Main function to generate completion with automatic fallback
export async function generateCompletion(
  prompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
    userApiKeys?: Record<string, string>;
    preferredProvider?: string;
    preferredModel?: string;
    strictProvider?: boolean;
  } = {}
): Promise<{ text: string; provider: string; model: string }> {
  const {
    maxTokens = 4000,
    temperature = 0.7,
    userApiKeys,
    preferredProvider,
    preferredModel,
    strictProvider = false,
  } = options;

  // Reorder providers if there's a preferred one
  const providersToTry = preferredProvider
    ? strictProvider
      ? [preferredProvider]
      : [preferredProvider, ...PROVIDER_PRIORITY.filter((p) => p !== preferredProvider)]
    : PROVIDER_PRIORITY;

  const errors: string[] = [];

  for (const provider of providersToTry) {
    const config = LLM_PROVIDERS[provider];
    if (!config) continue;

    const apiKey = getApiKey(provider, userApiKeys);
    if (!apiKey) {
      console.log(`⚠️ No API key for ${config.name}, skipping...`);
      continue;
    }

    // Determine which model to use
    const model = preferredModel && config.models.includes(preferredModel)
      ? preferredModel
      : config.models[0];
    if (!model) {
      errors.push(`${config.name}: No models configured`);
      continue;
    }

    console.log(`🔄 Trying ${config.name} with model ${model}...`);

    let result: string | null = null;

    if (provider === "google") {
      // Google Gemini has a different API
      result = await callGemini(apiKey, model, prompt, maxTokens, temperature);
    } else if (config.baseUrl) {
      // OpenAI-compatible APIs
      result = await callOpenAICompatible(
        config.baseUrl,
        apiKey,
        model,
        [{ role: "user", content: prompt }],
        maxTokens,
        temperature
      );
    }

    if (result) {
      console.log(`✅ ${config.name} (${model}) response successful`);
      return { text: result, provider, model };
    }

    errors.push(`${config.name}: Failed to get response`);
  }

  throw new Error(`All LLM providers failed. Errors: ${errors.join("; ")}`);
}

// Generate README with context from RAG embeddings
export async function generateReadme(
  context: string,
  projectName: string,
  githubUrl: string,
  options: {
    userApiKeys?: Record<string, string>;
    customPrompt?: string;
    includeMermaid?: boolean;
    includeArchitecture?: boolean;
    preferredProvider?: string;
    preferredModel?: string;
    strictProvider?: boolean;
  } = {}
): Promise<{ text: string; provider: string; model: string }> {
  const {
    userApiKeys,
    customPrompt,
    includeMermaid = false,
    includeArchitecture = true,
    preferredProvider,
    preferredModel,
    strictProvider,
  } = options;

  // Prevent hallucination if no context is provided
  if (!context || context.trim() === "" || context.length < 50) {
    throw new Error(
      "Insufficient code context found for this project! Please wait for indexing to complete or ensure your repository is not empty before generating a README."
    );
  }

  // Extract owner/repo from GitHub URL
  let githubInfo = "";
  let owner = "owner";
  let repo = "repo";
  try {
    const url = new URL(githubUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const ownerPart = pathParts[0];
    const repoPart = pathParts[1];
    if (ownerPart && repoPart) {
      owner = ownerPart;
      repo = repoPart;
      githubInfo = `
GitHub Repository: https://github.com/${owner}/${repo}
GitHub Issues: https://github.com/${owner}/${repo}/issues
GitHub Discussions: https://github.com/${owner}/${repo}/discussions
Contribute: https://github.com/${owner}/${repo}/contribute`;
    }
  } catch {
    // Invalid URL, continue with default owner/repo placeholders
  }

  const mermaidPrompt = includeMermaid
    ? `
11. **Mermaid Diagrams:** Include relevant Mermaid diagrams:
   - Architecture flow diagram
   - Data flow diagram (if applicable)
   - Component relationship diagram (for frontend projects)
   - Database schema diagram (if applicable)`
    : "";

  const architecturePrompt = includeArchitecture
    ? `
12. **Architecture Documentation:** Include a comprehensive architecture section explaining:
    - System design and components
    - Data flow and state management
    - Key design decisions
    - Scalability considerations (if applicable)`
    : "";

  const customPromptSection = customPrompt
    ? `\n\n**USER'S ADDITIONAL INSTRUCTIONS:**\n${customPrompt}`
    : "";

  const prompt = `You are a senior developer creating a PROFESSIONAL, DETAILED README.md for the project "${projectName}". You must analyze the provided code context and create comprehensive documentation.

**PROJECT CONTEXT (from code analysis):**
${context}
${githubInfo}
${customPromptSection}

**README SECTION REQUIREMENTS:**

1. **Title & Badges:** Generate accurate badges based on actual tech stack found. Include:
   - Build status badge (if CI/CD detected)
   - License badge (MIT if not specified)
   - Last commit badge
   - Tech stack badges

2. **Introduction:** Write 2-3 paragraphs explaining:
   - What this project does
   - Key features and capabilities
   - Target audience/use cases

3. **Features:** Bullet-point list of ACTUAL features found in code (e.g., "JWT authentication with refresh tokens", "Real-time dashboard with WebSocket updates").

4. **Tech Stack:** Detailed table with:
   - Library/Component name
   - Purpose
   - Version (if found)

5. **Quick Start / Installation:** 
   - Clone command: \`git clone https://github.com/${owner}/${repo}.git\`
   - Prerequisites
   - Step-by-step installation

6. **Project Structure:** Detailed tree of key directories with explanations.

7. **Configuration:** Environment variables needed, config files explanation.

8. **API Reference:** If API routes exist, document endpoints, methods, and examples.

9. **Contributing:** Guidelines with GitHub links.

10. **License:** Default to MIT if no license found.

${mermaidPrompt}
${architecturePrompt}

**IMPORTANT FORMATTING RULES:**
- Use proper Markdown formatting with headers, code blocks, and tables
- Include emoji for section headers to make it engaging
- Be SPECIFIC about this project, not generic
- If something isn't in the code, don't invent it
- Make it comprehensive but readable
- Ensure all code blocks have proper language tags

Generate a FULL, COMPLETE README now:`;

  return generateCompletion(prompt, {
    maxTokens: 8000,
    temperature: 0.7,
    userApiKeys,
    preferredProvider,
    preferredModel,
    strictProvider,
  });
}

// Generate just a mermaid diagram
export async function generateMermaidDiagram(
  context: string,
  projectName: string,
  diagramType: "architecture" | "flow" | "sequence" | "class" = "architecture",
  options: {
    userApiKeys?: Record<string, string>;
    preferredProvider?: string;
    preferredModel?: string;
    strictProvider?: boolean;
  } = {}
): Promise<{ text: string; provider: string; model: string }> {
  const diagramPrompts: Record<string, string> = {
    architecture: "system architecture showing components and their relationships",
    flow: "data flow diagram showing how data moves through the system",
    sequence: "sequence diagram showing typical request/response flow",
    class: "class diagram showing data models and their relationships",
  };

  const prompt = `Analyze the following code context and generate a Mermaid ${diagramPrompts[diagramType]} diagram for the project "${projectName}".

**CODE CONTEXT:**
${context}

**REQUIREMENTS:**
1. Generate ONLY a valid Mermaid diagram code block
2. Use appropriate Mermaid syntax (${diagramType === "architecture" ? "flowchart" : diagramType})
3. Keep it clear and readable
4. Focus on the most important components/flows
5. Use proper Mermaid syntax that will render correctly

Generate the Mermaid diagram now (wrap in \`\`\`mermaid code block):`;

  return generateCompletion(prompt, {
    maxTokens: 2000,
    temperature: 0.5,
    userApiKeys: options.userApiKeys,
    preferredProvider: options.preferredProvider,
    preferredModel: options.preferredModel,
    strictProvider: options.strictProvider,
  });
}
