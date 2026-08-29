import { createChatModel } from "./lc-model";
import { AskResult, AskResultSchema } from "./schema";

export async function askStructured(query: string): Promise<AskResult> {
  const { model } = createChatModel();

  // keep instructions brief so that schema stays visible to the model

  const system = "You are a concise assistant. Return only the requested JSON.";
  const user =
    `Summarize for a beginner:\n` +
    `"${query}"\n` +
    `Return fields: summary (short paragraph), confidence (0..1)`;

  const structured = model.withStructuredOutput(AskResultSchema);

  const result = await structured.invoke([
    {
      role: "system",
      content: system,
    },
    {
      role: "user",
      content: user,
    },
  ]);

  return result;
}
