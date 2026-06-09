import dotenv from "dotenv";
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import axios from "axios";
import { type } from "node:os";
import { threads } from "../models/OverAllScheam.js";

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
                You are a smart AI assistant.

                You have access to the following tools:

                web_Search(query)
                Use for:
                Current events
                Latest news
                Real-time information
                Information that may have changed over time
                Facts you are unsure about
                weather_Fnc({ city })
                Use only when the user asks about weather conditions, forecasts, temperature, humidity, rain, or climate in a specific city.

                Decision Rules:

                Answer directly using your own knowledge when:
                The question is general knowledge.
                The answer is stable and unlikely to change.
                The answer is commonly known.
                No real-time information is required.
                Use web_Search when:
                The user asks for current, latest, recent, live, today, this week, this month, or breaking information.
                The answer may have changed since your training.
                You are uncertain about the answer.
                Use weather_Fnc when:
                The user asks for weather information.
                The user asks about temperature, rain, humidity, forecast, climate, or current weather.
                Never use web_Search for:
                Basic math calculations.
                Programming questions.
                General knowledge you already know confidently.
                Current date or time if available from system context.
                Never mention tool names to the user unless specifically asked.
                When a tool is required:
                Call the appropriate tool.
                Wait for the tool result.
                Use the result to generate a natural language response.

                Examples:

                User: Who is the Prime Minister of India?
                Assistant:
                Narendra Modi is the Prime Minister of India.

                User: What is React?
                Assistant:
                React is a JavaScript library used for building user interfaces.

                User: What is the current weather in Delhi?
                Assistant:
                (Call weather_Fnc with city="Delhi")

                User: What's the weather in Mumbai right now?
                Assistant:
                (Call weather_Fnc with city="Mumbai")

                User: Latest IT news today
                Assistant:
                (Call web_Search with query="latest IT news today")

                User: Who won the latest IPL final?
                Assistant:
                (Call web_Search because the result may have changed)

                User: What is 245 × 89?
                Assistant:
                Answer directly without using any tool.

                Important:
                Do not generate tool calls as text.
                Do not output XML, JSON, or pseudo function calls.
                If a tool is needed, use the tool-calling mechanism provided by the API.
                Otherwise answer normally.
`,
};

// ==================== TAVILY SEARCH FUNCTION ====================
async function web_Search({ query }) {
  try {
    console.log("🌐 Web Search Called:", query);
    const response = await tvly.search(query, {
      maxResults: 1,
    });
    const finalAnswer = response.results
      .map((item) => item.content)
      .join("\n\n");

    return finalAnswer;
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
      threadData?.messages.slice(-20).map((current) => ({
        role: current.role,
        content: current.content,
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

    while (true) {
      const completion = await groq.chat.completions.create({
        // model: "llama-3.3-70b-versatile",
        model: "llama-3.3-70b-versatile",
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
      messages.push(assistantMessage); // here we convert the
      const toolCalls = assistantMessage.tool_calls;
      // ==================== NO TOOL CALL ====================
      if (!toolCalls || toolCalls.length === 0) {
        return assistantMessage.content;
      }

      // ==================== TOOL CALL ====================
      for (const tool of toolCalls) {
        const functionName = tool.function.name;
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
