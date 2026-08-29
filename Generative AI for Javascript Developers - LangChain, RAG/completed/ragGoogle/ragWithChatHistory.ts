import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createRetriever } from "./retriever";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "@langchain/classic/util/document";
import { ChatHandler, chat } from "../utils/chat";
import { BaseMessage, AIMessage, HumanMessage } from "@langchain/core/messages";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";

const prompt = ChatPromptTemplate.fromMessages([
  [
    "human",
    `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
  Context: {context} 
  `,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

// OpenAI chat LLM
// const llm = new ChatOpenAI({
//   model: "gpt-3.5-turbo",
//   maxTokens: 500,
// });

// Google chat LLM
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",   // if this model is not available anymore then please check another available model from google gemini api documentation
  
  // Important Note: There is a problem with maxOutputTokens parameters in google langchain package, it causes error
  // Don't use it for now, I will update the code in future if langchain team fixes this issue
  // maxOutputTokens: 500,
});

const outputParser = new StringOutputParser();

const retriever = await createRetriever();

const retrievalChain = RunnableSequence.from([
  (input) => input.question,
  retriever,
  formatDocumentsAsString,
]);

const generationChain = RunnableSequence.from([
  {
    question: (input) => input.question,
    context: retrievalChain,
    chat_history: (input) => input.chat_history,
  },
  prompt,
  llm,
  outputParser,
]);

const qcSystemPrompt = `Given a chat history and the latest user question
which might reference context in the chat history, formulate a standalone question
which can be understood without the chat history. Do NOT answer the question,
just reformulate it if needed and otherwise return it as is.`;

const qcPrompt = ChatPromptTemplate.fromMessages([
  ["system", qcSystemPrompt],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

const qcChain = RunnableSequence.from([qcPrompt, llm, outputParser]);

const chatHistory: BaseMessage[] = [];

const chatHandler: ChatHandler = async (question: string) => {
  let contextualizedQuestion = null;

  if (chatHistory.length > 0) {
    contextualizedQuestion = await qcChain.invoke({
      question,
      chat_history: chatHistory,
    });
    console.log(`Contextualized Question: ${contextualizedQuestion}`);
  }

  return {
    answer: generationChain.stream({
      question: contextualizedQuestion || question,
      chat_history: chatHistory,
    }),
    answerCallBack: async (answerText: string) => {
      chatHistory.push(new HumanMessage(contextualizedQuestion || question));
      chatHistory.push(new AIMessage(answerText));
    },
  };
};

chat(chatHandler);
