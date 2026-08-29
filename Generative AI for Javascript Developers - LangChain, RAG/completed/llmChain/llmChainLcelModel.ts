import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { LLMChain } from "@langchain/classic/chains";
import { RunnableSequence } from "@langchain/core/runnables";

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

  const llm = new ChatOpenAI({
    // temperature: 1,
    // topP: 1,
    maxTokens: 150,
    model: "gpt-3.5-turbo",
  });

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
