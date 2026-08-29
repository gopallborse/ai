import "dotenv/config";

import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0,
});

interface GraphState {
  randomNumber: number;
  question: string;
  answer: string;
}

function generateRandom() {
  return {
    randomNumber: Math.floor(Math.random() * 10),
  };
}

async function function1() {
  const question = "Explain the concept of quantum entanglement in 100 words.";

  const response = await llm.invoke([
    new HumanMessage(question),
  ]);

  return {
    question,
    answer: response.content as string,
  };
}

async function function2() {
  const question = "Explain the theory of relativity in 100 words.";

  const response = await llm.invoke([
    new HumanMessage(question),
  ]);

  return {
    question,
    answer: response.content as string,
  };
}

function router(state: GraphState) {
  if (state.randomNumber < 5) {
    return "function1";
  } else {
    return "function2";
  }
}

const graph = new StateGraph<GraphState>({
  channels: {
    randomNumber: {
      value: (x, y) => y ?? x,
      default: () => 0,
    },
    question: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
    answer: {
      value: (x, y) => y ?? x,
      default: () => "",
    },
  },
})
  .addNode("generateRandom", generateRandom)
  .addNode("function1", function1)
  .addNode("function2", function2)

  .addEdge(START, "generateRandom")

  .addConditionalEdges("generateRandom", router, {
    function1: "function1",
    function2: "function2",
  })

  .addEdge("function1", END)
  .addEdge("function2", END)

  .compile();

async function main() {
  const result = await graph.invoke({
    randomNumber: 0,
    question: "",
    answer: "",
  });

  console.log(result);
}

main();