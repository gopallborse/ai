import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { LLMChain } from "@langchain/classic/chains";
import { RunnableSequence } from "@langchain/core/runnables";
import * as bedrock from "@langchain/aws";
import * as claude from "@langchain/anthropic";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";

dotenv.config();

await personalisedPitch("Generative AI", "Javascript Developer", 100);

async function personalisedPitch(
  course: string,
  role: string,
  wordLimit: number
) {
  const promptTemplate = new PromptTemplate({
    template:
      "Describe the importance of learning {course} for a {role}. Limit the output to {wordLimit} words.",
    inputVariables: ["course", "role", "wordLimit"],
  });

  const formattedPrompt = await promptTemplate.format({
    course,
    role,
    wordLimit,
  });

  console.log("Formatted Prompt: ", formattedPrompt);

  // OpenAI LLM
  const llm = new ChatOpenAI({
    // temperature: 1,
    // topP: 1,
    maxTokens: 150,
    model: "gpt-3.5-turbo",
  });

  // Google Gemini LLM
  // const llm = new ChatGoogleGenerativeAI({
  //   model: "gemini-2.5-flash",   // if this model is not available anymore then please check another available model from google gemini api documentation
    
  //   // Important Note: There is a problem with maxOutputTokens parameters in google langchain package, it causes error
  //   // Don't use it for now, I will update the code in future if langchain team fixes this issue
  //   // maxOutputTokens: 150, 
    
  //   // temperature: 1,
  //   // topP: 1,
  // });

  // Anthropic Claude LLM
  // const llm = new claude.ChatAnthropic({
  //   maxTokens: 150,
  //   model: "claude-3-5-sonnet-20240620",
  //   temperature: 0.7,
  // });

  // AWS Bedrock LLM
  // const llm = new bedrock.ChatBedrockConverse({
  //   // model: "amazon.titan-text-lite-v1",
  //   model: "meta.llama3-70b-instruct-v1:0",
  //   maxTokens: 150,
  //   topP: 0.7,
  //   region: "us-east-1",
  //   credentials: {
  //     accessKeyId: process.env.AWS_ACESS_KEY_ID!,
  //     secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET!,
  //   },
  // });

  const outputParser = new StringOutputParser();

  // Option 1 - Langchain Legacy Chain

  // const legacyChain = new LLMChain({
  //   prompt: promptTemplate,
  //   llm,
  //   outputParser,
  // });

  // const legacyResponse = await legacyChain.invoke({
  //   course,
  //   role,
  //   wordLimit,
  // });

  // console.log("Answer from legacy LLM chain: ", legacyResponse);

  // Option 2 - LCEL chain

  // const lcelChain = promptTemplate.pipe(llm).pipe(outputParser);

  const lcelChain = RunnableSequence.from([promptTemplate, llm, outputParser]);

  const lcelResponse = await lcelChain.invoke({
    course,
    role,
    wordLimit,
  });

  console.log("Answer from LCEL chain: ", lcelResponse);
}
