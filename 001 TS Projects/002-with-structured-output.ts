import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";

const CountrySchema = z.object({
    country: z.string(),
    capital: z.string(),
    language: z.string(),
});

async function chat(question: string) {
    const model = new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: process.env.GROQ_API_KEY,
        temperature: 1,
    }).withStructuredOutput(CountrySchema);

    const response = await model.invoke(question);

    console.log("\nJSON Response:\n");
    console.log(response);
}

chat(
    "Return the country, capital, and primary official language for United Kingdom."
);