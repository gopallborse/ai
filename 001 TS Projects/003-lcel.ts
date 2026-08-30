import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

const CountrySchema = z.object({
    country: z.string(),
    capital: z.string(),
    language: z.string(),
});

const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        "Extract the requested country information.\n\n{format_instructions}",
    ],
    ["human", "{question}"],
]);

const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0,
});

const parser = StructuredOutputParser.fromZodSchema(CountrySchema);

const chain = RunnableSequence.from([
    prompt,
    model,
    parser,
]);

async function main() {
    const response = await chain.invoke({
        question:
            "Return the country, capital, and primary official language for United Kingdom.",
        format_instructions: parser.getFormatInstructions(),
    });

    console.log("\nParsed Response:\n");
    console.log(response);
}

main().catch(console.error);