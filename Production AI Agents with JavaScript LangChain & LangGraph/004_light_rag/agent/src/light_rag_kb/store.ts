// embeddings + vector store
// kb brain -> knowlege base
// picks an embedding model -> openai | gemini
// store ur embedding in ram
// letting us insert chunks and later sun search based on those chunks

import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";

// core concepts
// embeddings model ->
// turns this text -> array of numbers
// diff providers use diff vector spaces

// vector store
// searchable index
// "this is mt query" -> find me the closest chunks

type Provider = "openai" | "google";

function getProvider(): Provider {
  const getCurrentProvider = (
    process.env.RAG_MODEL_PROVIDER ?? "gemini"
  ).toLowerCase();
  return getCurrentProvider === "gemini" ? "google" : "openai";
}

//create embeddings client

function makeOpenAiEmbeddings() {
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) {
    throw new Error("Openai api key is missing");
  }

  return new OpenAIEmbeddings({
    apiKey: key,
    model: "text-embedding-3-small",
  });
}

function makeGoogleEmbeddings() {
  const key = process.env.GOOGLE_API_KEY ?? "";
  if (!key) {
    throw new Error("Google api key is missing");
  }

  return new GoogleGenerativeAIEmbeddings({
    apiKey: key,
    model: "gemini-embedding-001",
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });
}

function makeEmbeddings(provider: Provider) {
  return provider === "google"
    ? makeGoogleEmbeddings()
    : makeOpenAiEmbeddings();
}

// vector store

let store: MemoryVectorStore | null = null;
let currentSetProvider: Provider | null = null;

export function getVectorStore(): MemoryVectorStore {
  const provider = getProvider();

  // same provider, keep existing store in memory
  if (store && currentSetProvider === provider) {
    return store;
  }

  // provider changed or first time call - build a brand new provider
  store = new MemoryVectorStore(makeEmbeddings(provider));
  currentSetProvider = provider;

  return store;
}

// input -> docs
//  pageContent: slice,
//           metadata: {
//             source,
//             chunkId,
//           },

// process ->
// get the singleton vector store
// add documents -> docs
// stores in memory

// chunk count

export async function addChunks(docs: Document[]): Promise<number> {
  if (!Array.isArray(docs) || docs.length === 0) return 0;

  const store = getVectorStore();

  await store.addDocuments(docs);

  return docs.length;
}

export function resetStore() {
  store = null;
  currentSetProvider = null;
}
