import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getServerEnv } from "../config/env";

// Cache of process-wide singleton instances. Creating a new client per request
// allocates a fresh HTTP agent and re-parses configuration; reusing them keeps
// latency and memory stable under load.
let cachedChatModel: ChatOpenAI | undefined;
let cachedEmbeddings: OpenAIEmbeddings | undefined;

export function getChatModel(): ChatOpenAI {
  if (!cachedChatModel) {
    const env = getServerEnv();
    cachedChatModel = new ChatOpenAI({
      model: "gpt-4o-mini",
      apiKey: env.OPENAI_API_KEY || undefined,
      temperature: 0.3,
    });
  }
  return cachedChatModel;
}

export function getEmbeddings(): OpenAIEmbeddings {
  if (!cachedEmbeddings) {
    const env = getServerEnv();
    cachedEmbeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: env.OPENAI_API_KEY || undefined,
    });
  }
  return cachedEmbeddings;
}

// Test-only escape hatch to reset cached instances.
export function resetModelCache(): void {
  cachedChatModel = undefined;
  cachedEmbeddings = undefined;
}

export function getImageModel() {
  const env = getServerEnv();
  return new ChatOpenAI({
    model: "gpt-image-2" as string,
    apiKey: env.OPENAI_API_KEY || undefined,
  });
}

export function getVideoModel() {
  const env = getServerEnv();
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash" as string,
    apiKey: env.GOOGLE_API_KEY || undefined,
  });
}

export function isLangSmithEnabled(): boolean {
  const env = getServerEnv();
  return env.LANGSMITH_TRACING === "true" && env.LANGSMITH_API_KEY.length > 0;
}
