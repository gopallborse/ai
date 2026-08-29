// nodemon --watch . --exec tsx .\006-weather-agent.ts

import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

const weatherTool = tool(
    async ({ city }) => {
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            throw new Error("OPENWEATHER_API_KEY is not configured");
        }

        const url =
            `https://api.openweathermap.org/data/2.5/weather` +
            `?q=${encodeURIComponent(city)}` +
            `&appid=${apiKey}` +
            `&units=metric`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Could not find weather for "${city}"`);
        }

        console.log("Weather tool called");

        const data = await response.json();

        return JSON.stringify({
            city: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            feelsLike: data.main.feels_like,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            windSpeed: data.wind.speed,
            conditions: data.weather[0].description,
        });
    },
    {
        name: "get_current_weather",
        description:
            "Get the current weather conditions for a city. " +
            "Use this whenever the user asks about current weather.",
        schema: z.object({
            city: z.string().describe("City name, e.g. Pune or London"),
        }),
    }
);

const currencyTool = tool(
    async ({ amount, from, to }) => {
        const apiKey = process.env.EXCHANGE_RATE_API_KEY;

        if (!apiKey) {
            throw new Error("EXCHANGE_RATE_API_KEY is not configured");
        }

        console.log("Currency tool called");

        const url =
            `https://v6.exchangerate-api.com/v6/${apiKey}/pair/` +
            `${encodeURIComponent(from.toUpperCase())}/` +
            `${encodeURIComponent(to.toUpperCase())}/` +
            `${amount}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Could not convert ${from} to ${to}`);
        }

        const data = await response.json();

        if (data.result !== "success") {
            throw new Error(
                `Could not convert ${from} to ${to}: ${data["error-type"] || "Unknown error"
                }`
            );
        }

        return JSON.stringify({
            amount,
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            exchangeRate: data.conversion_rate,
            convertedAmount: data.conversion_result,
        });
    },
    {
        name: "convert_currency",
        description:
            "Convert an amount from one currency to another using the current exchange rate. " +
            "Use this whenever the user asks to convert currencies, exchange money, " +
            "or asks how much one currency is worth in another currency.",
        schema: z.object({
            amount: z
                .number()
                .positive()
                .describe("Amount of money to convert, e.g. 100"),

            from: z
                .string()
                .describe(
                    "Source currency ISO 4217 code, e.g. USD, EUR, GBP, INR"
                ),

            to: z
                .string()
                .describe(
                    "Target currency ISO 4217 code, e.g. USD, EUR, GBP, INR"
                ),
        }),
    }
);

const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
});

const agent = createReactAgent({
    llm: model,
    tools: [weatherTool, currencyTool],
});

async function main() {
    const result = await agent.invoke({
        messages: [
            {
                role: "user",
                content: "How much is 20_000 Dirham in INR?",
            },
        ],
    });

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    console.log(lastMessage.content);
}

main().catch(console.error);