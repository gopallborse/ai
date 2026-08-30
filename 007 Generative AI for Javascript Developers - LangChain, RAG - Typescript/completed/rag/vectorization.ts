import dotenv from "dotenv";
import { loadDocuments } from "./loadDocuments";
import { splitDocuments } from "./splitDocuments";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import cliProgress from "cli-progress";
import {GoogleGenerativeAIEmbeddings} from "@langchain/google-genai";

dotenv.config();

const rawDocuments = await loadDocuments();

const chunkedDocuments = await splitDocuments(rawDocuments);

// OpenAI Embeddings LLM
// Important Note: make sure the pinecone index is created with 1536 dimensions for openai embedding model
const embeddingLLM = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
});

// Google Gemini Embeddings LLM
// Important Note: make sure the pinecone index is created with 3072 dimensions for google embedding model
// const embeddingLLM = new GoogleGenerativeAIEmbeddings({
//   model: "gemini-embedding-001",
// });

const pinecone = new Pinecone();

const pineconeIndex = pinecone.index("langchain-docs");

console.log("Starting Vecrotization...");
const progressBar = new cliProgress.SingleBar({});
progressBar.start(chunkedDocuments.length, 0);

for (let i = 0; i < chunkedDocuments.length; i = i + 100) {

  const batch = chunkedDocuments.slice(i, i + 100);

  // Google Gemini free tier has rate limit of 100 requests per min for the embedding model
  // Wait 1.5 minute before processing each batch if you are using Google Gemini (except the first one)
  // if (i > 0) {
  //   await new Promise(resolve => setTimeout(resolve, 90000));
  // }

  await PineconeStore.fromDocuments(batch, embeddingLLM, {
    pineconeIndex,
  });

  progressBar.increment(batch.length);
}

progressBar.stop();
console.log("Chunked documents stored in pinecone.");
