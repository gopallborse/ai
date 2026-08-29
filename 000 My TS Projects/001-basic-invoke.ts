import "dotenv/config";

import { ChatGroq } from "@langchain/groq";

async function chat(question: string) {
    const model = new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: process.env.GROQ_API_KEY,
        temperature: 1,
    });

    const response = await model.invoke(question);

    console.log("\nAnswer:\n");
    console.log(response.content);
}

chat("What is the capital of India?");