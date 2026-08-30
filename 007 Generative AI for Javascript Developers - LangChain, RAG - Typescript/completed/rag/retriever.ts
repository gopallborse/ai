import { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import dotenv from "dotenv";
import {GoogleGenerativeAIEmbeddings} from "@langchain/google-genai";

dotenv.config();

export async function createRetriever(): Promise<VectorStoreRetriever> {
  
  // OpenAI Embedding LLM
  // Important note: The embedding model for retrieval must be same as the embedding model used for vectorization
  const embeddingLLM = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  // Google Gemini Embedding LLM
  // Important note: The embedding model for retrieval must be same as the embedding model used for vectorization
  // const embeddingLLM = new GoogleGenerativeAIEmbeddings({
  //   model: "gemini-embedding-001",
  // });

  const pinecone = new Pinecone();

  // Important Note: Make sure that the name of the index is same as used during the vectorization process
  const pineconeIndex = pinecone.index("langchain-docs");

  const vectorStore = await PineconeStore.fromExistingIndex(embeddingLLM, {
    pineconeIndex,
  });

  const retriever = vectorStore.asRetriever();

  return retriever;
}

// test code

// const retrieverChain = await createRetriever();

// const context = await retrieverChain.invoke("What is langchain?");

// console.log(context);
