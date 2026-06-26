import dotenv from "dotenv";
// import { tavily } from "@tavily/core";
import axios from "axios";
import { type } from "node:os";
import { message, threads } from "../models/OverAllScheam.js";
import { convertProcessSignalToExitCode } from "node:util";
import { pipeline } from "@xenova/transformers";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { TavilySearch } from "@langchain/tavily";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
dotenv.config();
//=========================================================================
// ==================== GROQ ====================
// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });
//======================LLM LANNGRAPH//============================

// ==================== TAVILY- Langchain ====================
const searchweb = new TavilySearch({
  maxResults: 3,
  topic: "general",
});
//===================================TOOLS //==================
const websearchTool = tool(
  async ({ query }) => {
    const webResult = await searchweb.invoke({ query });
    return JSON.stringify(webResult);
  },
  {
    name: "webSearch",
    description:
      "Search the web for current, recent, or real-time information. Use this when the user asks about latest news, recent events, current facts, changing information, or anything that may require up-to-date internet results. Do not use it for simple general knowledge if the answer is already known from conversation context or model knowledge.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "A focused web search query containing the exact topic, person, company, event, location, or question to look up online.",
        ),
    }),
  },
);
const weatherTool = tool(
  async ({ city }) => {
    return await weather_Fnc({ city });
  },
  {
    name: "weather_Fnc",
    description:
      "Get the current weather for a city. Use this only when the user asks about weather, temperature, humidity, or current weather conditions for a specific place.",
    schema: z.object({
      city: z
        .string()
        .describe(
          "The city name to get current weather for, such as 'Delhi', 'Mumbai', or 'London'.",
        ),
    }),
  },
);

//===========================================Node function Formation //===========================================
//==========1
async function loadHistoryNode(state) {
  const threadData = await threads.findOne({
    threadId: state.threadId,
    user: state.userId,
  });
  const historyData =
    threadData?.messages
      .slice(-10)
      .map((current) => {
        if (current.role === "user") {
          return new HumanMessage(current.content);
        }
        if (current.role === "assistant") {
          return new AIMessage(current.content);
        }
        if (current.role === "system") {
          return new SystemMessage(current.content);
        }
        return null;
      })
      .filter(Boolean) || [];

  return { messages: historyData };
}
//====2
async function routeRetrievalNode(state) {
  const question = state.userMessage;
  const prompt = `You are a retrieval decision assistant.
Decide whether external retrieval is needed to answer the user's query.

Return only JSON:
{"retrievalNeeded": true}
or
{"retrievalNeeded": false}

User query:${question}`;
  const smallLLMCALL = await llm.invoke(prompt);
  const parsedData = smallLLMCALL.content;
  const parsed = JSON.parse(parsedData);
  return { retrievalNeeded: parsed.retrievalNeeded }; // this where retrieveNeeded get updated  here
}
//. node - 3
async function retrievalNode(state) {
  const ragData = await retrieval(state.userMessage);
  return { retrievedContext: ragData };
}
//====================Node 4-//=================
function skipReterivalNode(state) {
  return { retrievedContext: "" };
}
//================Node -5 //===============================
async function buildInputNode(state) {
  const retrivedData = state.retrievedContext?.trim();
  const oldhistory = state.messages || [];
  const userMessage = state.userMessage;
  const finalContext = [];
  // System Prompt
  finalContext.push(new SystemMessage(SYSTEM_PROMPT.content));
  // /======================RETRIVAL PROMPT .//========================================
  if (retrivedData) {
    finalContext.push(
      new SystemMessage(`
The following information is retrieved from the application's official private knowledge base.

This knowledge base was intentionally created and provided by the application's developer.

This retrieved context is authoritative and should be treated as the primary source of truth for this conversation.

Instructions:
- Use the retrieved context whenever it contains the information needed.
- Prefer the retrieved context over your own pretrained knowledge whenever they differ.
- Answer naturally using the retrieved context.
- Do not ignore retrieved facts simply because they differ from your internal knowledge.
- Do not invent information that is not present in the retrieved context.
- If the answer is not present in the retrieved context, answer using your general knowledge or state that you do not know.
- Maintain conversation continuity with previous messages while treating the retrieved context as authoritative.

Retrieved Context:

${retrivedData}
`),
    );
  }
  //===========================================================================
  finalContext.push(...oldhistory); // which already in Langchain method
  finalContext.push(new HumanMessage(userMessage));
  return {
    messages: finalContext,
  };
}

const tools = [websearchTool, weatherTool];
const toolNODE = new ToolNode(tools);

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY, // Default value.
  model: "openai/gpt-oss-120b",
  temperature: 0,
});
const llmwithTools = llm.bindTools(tools);
//================NODE -6 //====================
async function llmNode(state) {
  const llmcall = await llmwithTools.invoke(state.messages);
  console.log("============ LLM ============");
  console.dir(llmcall, { depth: null });
  console.log("=============================");
  return { messages: [llmcall] };
}

//====================================StateAnnotation//======================================
const StateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: (left, right) => {
      if (!right) return left;
      return left.concat(Array.isArray(right) ? right : [right]);
    },
    default: () => [], // Empty array
  }),
  userMessage: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => "",
  }),
  threadId: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => "",
  }),
  userId: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => "",
  }),
  retrievalNeeded: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => false, // cuz this is boolen field
  }),
  retrievedContext: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => "",
  }),
  searchCount: Annotation({
    reducer: (_, right) => {
      return right;
    },
    default: () => 0,
  }),
  maxToolCalls: Annotation({
    reducer: (_, right) => right,
    default: () => 2, // number of tools
  }),
});
//=======================Condition1 //================================
function shouldContinue1(state) {
  const retrieveNeeded = state.retrievalNeeded;
  if (retrieveNeeded) {
    return "retrievalNode";
  }
  return "skipRetrievalNode";
}
function shouldContinue2(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage?.tool_calls.length) {
    return "toolNode";
  }
  return "__end__";
}
//=====================================================================================
const graph = new StateGraph(StateAnnotation)
  .addNode("historyNode", loadHistoryNode)
  .addNode("routeRetrievalNode", routeRetrievalNode)
  .addNode("retrievalNode", retrievalNode)
  .addNode("skipRetrievalNode", skipReterivalNode)
  .addNode("buildInputNode", buildInputNode)
  .addNode("llmNode", llmNode)
  .addNode("toolNode", toolNODE)
  .addEdge("__start__", "historyNode")
  .addEdge("historyNode", "routeRetrievalNode")
  .addConditionalEdges("routeRetrievalNode", shouldContinue1)
  .addEdge("retrievalNode", "buildInputNode")
  .addEdge("skipRetrievalNode", "buildInputNode")
  .addEdge("buildInputNode", "llmNode")
  .addConditionalEdges("llmNode", shouldContinue2)
  .addEdge("toolNode", "llmNode");
const finalGraph = graph.compile();

//========================PineCone Connection//================
const pinecone = new PineconeClient({ apiKey: process.env.PINECONE_KEY });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
// ==================== SYSTEM PROMPT ====================
const SYSTEM_PROMPT = {
  role: "system",
  content: `You are a concise, helpful AI assistant.

      ## Tools
      - webSearch(query) — for current events, recent news, real-time info
      - weather_Fnc(city) — for weather queries only

      ## Rules
      - Answer directly from knowledge or context first. Call tools only for genuinely new/real-time info.
      - Never repeat a tool call for the same question.
      - Be brief. Match response length to the question.

      ## Examples
      User: What is React?
      Assistant: React is a JavaScript library for building UIs using reusable components.

      User: 25 * 45?
      Assistant: 1125

      User: Latest AI news today?
      Assistant: [calls webSearch("latest AI news today")]

      User: Weather in Delhi?
      Assistant: [calls weather_Fnc("Delhi")]

      User: What did you find in the search?
      Assistant: [answers from previous tool result — no new tool call]`,
};
async function weather_Fnc({ city }) {
  try {
    console.log(` Weather api is call .......`, city);
    const response = await axios.get(
      "https://api.weatherapi.com/v1/current.json",
      {
        params: {
          key: process.env.WEATHER_API,
          q: city,
        },
      },
    );
    return JSON.stringify({
      name: response.data.location.name,
      country: response.data.location.country,
      TemperatureinCelsius: response.data.current.temp_c,
      temperatureINfarenhite: response.data.current.temp_f,
      humidity: response.data.current.humidity,
      condition: response.data.current.humidity,
    });
  } catch (err) {
    console.log("Status:", err.response?.status);
    console.log("Data:", err.response?.data);
    console.log(err.message);
    return "Unable to fetch information ";
  }
}

// ==================== MAIN GROQ FUNCTION ====================
// ===== here every request are creating new message array
const embeeder = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2",
);
async function retrieval(userMessage) {
  // we need to convert the userMessage to embeeding process
  const output = await embeeder(userMessage, {
    pooling: "mean",
    normalize: true,
  });
  const queryVector = Array.from(output.data);
  const result = await pineconeIndex.query({
    vector: queryVector,
    topK: 5, // for better  understand for the llm to  find answers
    includeMetadata: true,
  });
  console.log(
    result.matches.map((current) => ({
      score: current.score,
      text: current.metadata.text,
    })),
  );
  return result.matches.map((current) => current.metadata.text).join("\n\n"); // at last it is basically a string here
}

const Groq_API = async (userMessage, threadID, userID) => {
  try {
    if (!userMessage) {
      throw new Error("Message is required");
    }
    const query = userMessage.toLowerCase();
    if (
      query.includes("current date") ||
      query.includes("today date") ||
      query.includes("what is today's date") ||
      query.includes("today's date")
    ) {
      return new Date().toDateString();
    }

    if (query.includes("randiputram") && query.includes("india")) {
      return "Aryan Naryan Thakur";
    }
    //==========================Graph  Final Execution COde //=======================
    const finalState = await finalGraph.invoke({
      userMessage,
      threadId: threadID,
      userId: userID,
    });
    console.log(finalState);
    console.log(
      `Ai Message :`,
      finalState.messages[finalState.messages.length - 1].content,
    );
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    return lastMessage?.content || "Sorry, something went wrong.";
  } catch (err) {
    console.log(err.message);
    console.log(err);
    console.log(err.stack);
    return "Sorry, something went wrong.";
  }
};
export { Groq_API };
