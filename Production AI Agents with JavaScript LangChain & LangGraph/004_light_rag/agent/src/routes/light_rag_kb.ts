import { Router } from "express";
import * as z from "zod";
import { ingestText } from "../light_rag_kb/ingest";
import { resetStore } from "../light_rag_kb/store";
import { askKB } from "../light_rag_kb/ask";

export const kbRouter = Router();

const IngestBody = z.object({
  text: z.string().min(1, "Provide some text to ingest"),
  source: z.string().optional(),
});

type IngestBodyT = z.infer<typeof IngestBody>;

kbRouter.post("/ingest", async (req, res) => {
  try {
    const body = IngestBody.parse(req.body) as IngestBodyT;

    const result = await ingestText({
      text: body.text,
      source: body.source ?? "pasted text",
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ error: "Some error occured while ingesting" });
  }
});

kbRouter.post("/reset", async (_req, res) => {
  resetStore();
  return res.status(200).json({ ok: true, cleared: true });
});

const AskBody = z.object({
  query: z.string().min(3, "Please ask a complete query"),
  k: z.number().int().min(1).max(10).optional(),
});

type AskBodyT = z.infer<typeof AskBody>;

kbRouter.post("/ask", async (req, res) => {
  try {
    const body = AskBody.parse(req.body) as AskBodyT;

    const result = await askKB(body.query, body.k ?? 2);

    return res.status(200).json({
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
    });
  } catch (e) {
    res.status(400).json({ error: "Some error occured while ingesting" });
  }
});
