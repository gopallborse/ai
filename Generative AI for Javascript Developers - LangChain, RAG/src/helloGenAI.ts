import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import {ChatGoogleGenerativeAI} from "@langchain/google-genai";

dotenv.config();

const llm = new ChatOpenAI();

// For Google Gemini model, uncomment the following statement and comment the openAI statement above
// Please ensure GOOGLE_API_KEY env variable is set in .env file
// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-2.5-flash"   // if this model is not available anymore then please check another available model from google gemini api documentation
// });

const response = await llm.invoke(
  "Describe the importance of learning generative AI for javascript developers in 50 words."
);

console.log(response);
