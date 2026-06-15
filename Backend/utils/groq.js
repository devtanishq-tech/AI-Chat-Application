import dotenv from "dotenv";
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import axios from "axios";
import { type } from "node:os";
import { threads } from "../models/OverAllScheam.js";
import { convertProcessSignalToExitCode } from "node:util";

dotenv.config();

// ==================== GROQ ====================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ==================== TAVILY ====================
const tvly = tavily({
  apiKey: process.env.TAVILY_KEY,
});

// ==================== SYSTEM PROMPT ====================
const SYSTEM_PROMPT = {
  role: "system",
  content: `
You are a helpful AI assistant.

Available tools:

1. web_Search(query)
   Use for:
   - Current events
   - Latest news
   - Real-time information
   - Information that may have changed over time

2. weather_Fnc(city)
   Use only for weather-related questions.

Rules:

- Answer directly when the answer is general knowledge.
- Use tools only when necessary.
- After receiving a tool result, answer the user.
- Do not repeatedly call the same tool for the same question.
- Prefer answering after the first tool result.
- Never generate tool calls as text.
- Use the tool-calling API only.
- Keep answers concise and accurate.


#IMPORTANT:

If the answer can be derived from previous conversation messages,
do NOT call any tool.

Use existing conversation context first.

Only call tools for NEW information that is unavailable in the conversation.

Examples:

User: What is React?
Assistant: Answer directly.

User: Latest AI news today
Assistant: Use web_Search.

User: Weather in Delhi
Assistant: Use weather_Fnc.

User: 25 * 45
Assistant: Answer directly.
`,
};

// ==================== TAVILY SEARCH FUNCTION ====================
async function web_Search({ query }) {
  try {
    console.log("🌐 Web Search Called:", query);
    const response = await tvly.search(query, {
      maxResults: 3,
      includeAnswer: true,
    });
    console.log(`Printation of respond ....`);
    return JSON.stringify({
      answer: response.answer,
      sources: response.results.map((item) => ({
        title: item.title,
        score: item.score,
        url: item.url,
      })),
    });
  } catch (err) {
    console.error("Tavily Error:", err);
    return "Unable to retrieve web search results.";
  }
}
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
// weather_Fnc({
//   city: "New Delhi",
// });

// ==================== MAIN GROQ FUNCTION ====================
// ===== here every request are creating new message array -
const Groq_API = async (userMessage, threadID, userID) => {
  try {
    if (!userMessage) {
      throw new Error("Message is required");
    }

    const threadData = await threads.findOne({
      threadId: threadID,
      user: userID,
    });
    // on  each request we are creating a history array of object which fetches data from the databse , and we passes them into the message array
    const history =
      threadData?.messages.slice(-5).map((current) => ({
        role: current.role,
        content: current.content,
        tool_calls: current.tool_calls,
        tool_call_id: current.tool_call_id,
        name: current.name,
      })) || [];
    const messages = [
      SYSTEM_PROMPT,
      ...history, // basically passing overall userid  history to the message params
      {
        role: "user",
        content: userMessage,
      },
    ];
    const query = userMessage.toLowerCase();

    if (
      query.includes("current date") ||
      query.includes("today date") ||
      query.includes("what is today's date") ||
      query.includes("today's date")
    ) {
      return new Date().toDateString();
    }
    if (query.includes("current Prime Minister of India ")) {
      return "";
    }
    let searchCount = 0;
    let MAX_TOOL_CALL = 2;
    while (true) {
      const completion = await groq.chat.completions.create({
        // model: "llama-3.3-70b-versatile",
        model: "openai/gpt-oss-120b",
        messages, // this is where messages array passed  to the llm model;
        temperature: 0,
        frequency_penalty: 0,
        max_completion_tokens: 1000,
        tools: [
          // web_search function occur=============
          {
            type: "function",
            function: {
              name: "web_Search",
              description:
                "Search the internet for real-time or latest information.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query to look up on the web.",
                  },
                },
                required: ["query"],
              },
            },
          },
          // ================ weather_function //=============================
          {
            type: "function",
            function: {
              name: "weather_Fnc",
              description: "Give current Weather information for a city",
              parameters: {
                type: "object",
                properties: {
                  city: {
                    type: "string",
                    description: "Search weather of the city",
                  },
                },
                required: ["city"],
              },
            },
          },
        ],

        tool_choice: "auto",
      });
      const assistantMessage = completion.choices[0].message;
      console.log(assistantMessage);
      // debug //====
      console.log(JSON.stringify(completion.choices[0].message, null, 2));
      //==================
      messages.push({
        role: assistantMessage.role,
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });
      const toolCalls = assistantMessage.tool_calls;
      // ==================== NO TOOL CALL ====================
      if (!toolCalls || toolCalls.length === 0) {
        return assistantMessage.content;
      }
      // ==================== TOOL CALL ====================
      for (const tool of toolCalls) {
        const functionName = tool.function.name;
        console.log(tool);
        const functionArgs = JSON.parse(tool.function.arguments);
        console.log(functionArgs);

        if (functionName === "weather_Fnc") {
          const answer = await weather_Fnc(functionArgs);
          messages.push({
            role: "tool",
            tool_call_id: tool.id,
            name: functionName,
            content: answer,
          });
        }

        if (functionName === "web_Search") {
          searchCount++;
          if (searchCount > MAX_TOOL_CALL) {
            return "Unable to verify the information reliably.";
          }
          const toolResult = await web_Search(functionArgs);
          messages.push({
            tool_call_id: tool.id,
            role: "tool",
            name: functionName,
            content: toolResult,
          });
        }
      }
    }
  } catch (err) {
    console.log(err.message);
    console.log(err);
    console.log(err.stack);
    return "Sorry, something went wrong.";
  }
};
export { Groq_API };
