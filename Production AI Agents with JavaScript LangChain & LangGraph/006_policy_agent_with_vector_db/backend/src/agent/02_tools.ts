// simple functions that agent is going to call
// kb_search
// input -> {query : string, namespace}
// contexts

import { z } from "zod";
import { tool } from "langchain";
import { retrieveRelevantChunks } from "../kb/05_retriever";

const DEFAULT_NAMESPACE = "default";

export const kbSearchTool = tool(
  async ({ question }: { question: string }) => {
    const ns = DEFAULT_NAMESPACE;
    const { docs, confidence } = await retrieveRelevantChunks(question, ns, 2);

    const contexts = docs.map((doc) => {
      const source = (doc?.metadata?.source as string) || "unknown_source";

      const chunkId =
        (doc?.metadata?.chunkId as number) ??
        (doc?.metadata?._chunkIndex as number) ??
        0;

      const preview =
        doc.pageContent.length > 400
          ? doc.pageContent.slice(0, 400) + "..."
          : doc.pageContent;

      return {
        source,
        chunkId,
        preview,
      };
    });

    return {
      confidence,
      namespace: ns,
      contexts,
    };
  },
  {
    name: "kb_search",
    description: "Search the documentation KB for relevant answers",
    schema: z.object({
      question: z
        .string()
        .describe(
          `User's question or follow up that must be answered from docs`
        ),
    }),
  }
);

export const agentTools = [kbSearchTool]; // multiple tools also
