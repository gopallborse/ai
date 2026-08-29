import "dotenv/config";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_BASE_URL,
});

export async function ingestPDF(filePath) {
  try {
    console.log("Loading PDF...");

    const loader = new PDFLoader(filePath);

    const docs = await loader.load();

    console.log(`Pages: ${docs.length}`);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    splitDocs.forEach((doc) => {
      doc.metadata = {
        source: doc.metadata.source || "",
        page: doc.metadata.loc?.pageNumber || 1,
      };
    });

    console.log(`Chunks: ${splitDocs.length}`);

    console.log("Creating embeddings...");

    // Delete previous collection (optional)
    try {
      const existing = new Chroma(embeddings, {
        collectionName: "pdf-rag",
        host: "localhost",
        port: 8000,
      });

      await existing.deleteCollection();
      console.log("Old collection deleted.");
    } catch (err) {
      console.log("No previous collection.");
    }

    await Chroma.fromDocuments(splitDocs, embeddings, {
      collectionName: "pdf-rag",
      host: "localhost",
      port: 8000,
    });

    console.log("Embedding Complete ✅");

    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
