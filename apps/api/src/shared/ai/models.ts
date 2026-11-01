import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getServerEnv } from "../config/env";

export function getChatModel() {
  const env = getServerEnv();
  return new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: env.OPENAI_API_KEY || undefined,
    temperature: 0.3,
  });
}

export function getEmbeddings() {
  const env = getServerEnv();
  return new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: env.OPENAI_API_KEY || undefined,
  });
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
