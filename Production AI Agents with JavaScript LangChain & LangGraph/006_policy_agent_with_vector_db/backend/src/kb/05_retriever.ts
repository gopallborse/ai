// question -> [Retriever] -> retrive relevant chunks

import type { Document } from "@langchain/core/documents";
import { getVectorStore } from "./03_vectorStore";

export interface RetrieverResult {
  docs: Document[];
  confidence: number;
}

export async function retrieveRelevantChunks(
  query: string,
  namespace: string = "default",
  k: number = 2
): Promise<RetrieverResult> {
  if (!query.trim()) {
    return {
      docs: [],
      confidence: 0,
    };
  }

  const vectorStore = await getVectorStore();

  // embeds 'query'
  // runs atlas vector search on our chunks that we have ingested in our store
  // find the similar chunks and return the results in this 'RetrieverResult' format

  const results = await vectorStore.similaritySearchWithScore(query, k, {
    namespace,
  });

  if (!results?.length) {
    return {
      docs: [],
      confidence: 0,
    };
  }

  const docs: Document[] = results.map(([doc]) => doc);

  // taking the best score
  // clamp [0,1]
  // round this to 2 decimals

  // pls consider -> you MUST confirm score semantics from ur index config

  const scores = results.map(([_, score]) => score);
  const best = Math.max(...scores);
  const normalized = Math.max(0, Math.min(1, best));
  const confidence = Number(normalized.toFixed(2));

  return { docs, confidence };
}
