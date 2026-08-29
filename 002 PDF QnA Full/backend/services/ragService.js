import "dotenv/config";

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings, ChatOllama } from "@langchain/ollama";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL,
});

const vectorStore = new Chroma(embeddings, {
  collectionName: "pdf-rag",
  host: "localhost",
  port: 8000,
});

const model = new ChatOllama({
  model: "gemma4:latest",
  baseUrl: process.env.OLLAMA_BASE_URL,
});

export async function askQuestion(question) {
  const docs = await vectorStore.similaritySearch(question, 4);

  const context = docs.map((doc) => doc.pageContent).join("\n\n");

  const response = await model.invoke(`
      You are a helpful assistant.

      Answer ONLY using the context below.

      If the answer cannot be found in the context, say:

      "I couldn't find the answer in the uploaded PDF."

      Context:
      ${context}

      Question:
      ${question}
  `);

  return {
    answer: response.content,
    sources: docs.map((doc) => ({
      page: doc.metadata.page,
      source: doc.metadata.source,
    })),
  };
}
