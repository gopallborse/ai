import dotenv from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import {GoogleGenerativeAIEmbeddings} from "@langchain/google-genai";

dotenv.config();
const embeddingsLLM = new OpenAIEmbeddings();

// If you are using Google Gemini, then uncomment the below statement and comment the openAIEmbeddings statement

// const embeddingsLLM = new GoogleGenerativeAIEmbeddings({
//     model: "gemini-embedding-001", // If this model is not available anymore, then use another available embeddings model from google documentation
// });

const embeddings = await embeddingsLLM.embedQuery("What is vector embedding?");

console.log(embeddings);

console.log("Array Length: ", embeddings.length);
