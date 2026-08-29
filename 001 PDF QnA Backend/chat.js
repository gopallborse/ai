import "dotenv/config";

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

async function main() {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-2",
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const vectorStore = new Chroma(embeddings, {
    collectionName: "pdf-rag",
    host: "localhost",
    port: 8000,
  });

  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0,
  });

  const rl = readline.createInterface({ input, output });

  while (true) {
    const question = await rl.question("\nAsk a question (or 'exit'): ");

    if (question.toLowerCase() === "exit") break;

    const docs = await vectorStore.similaritySearch(question, 4);

    console.log("\nRetrieved Chunks:\n");

    docs.forEach((doc, index) => {
      console.log(`Chunk ${index + 1}`);
      console.log(doc.pageContent);
      console.log("------------------------------");
    });

    const context = docs.map((d) => d.pageContent).join("\n\n");

    const response = await model.invoke(`
        Answer ONLY using the context below.

        Context:
        ${context}

        Question:
        ${question}
        `);

    console.log("\nAnswer:\n");
    console.log(response.content);
  }

  rl.close();
}

main();
