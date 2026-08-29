import "dotenv/config";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

async function main() {
  try {
    const loader = new PDFLoader("./pdfs/sample.pdf");

    const docs = await loader.load();

    console.log("Pages:", docs.length);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    // Remove complex metadata that Chroma doesn't support
    splitDocs.forEach((doc) => {
      doc.metadata = {
        source: doc.metadata.source || "",
        page: doc.metadata.loc?.pageNumber || 1,
      };
    });

    console.log("Chunks:", splitDocs.length);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-2",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    console.log("Creating vector store...");

    await Chroma.fromDocuments(splitDocs, embeddings, {
      collectionName: "pdf-rag",
      host: "localhost",
      port: 8000,
    });

    console.log("Embedding Complete ✅");
  } catch (err) {
    console.error(err);
  }
}

main();