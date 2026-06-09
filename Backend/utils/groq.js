import dotenv from "dotenv";
import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import axios from "axios";
import { type } from "node:os";

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

You have access to two tools:

1. web_Search
   - Use for latest news, internet search, current information.

2. getWeather
   - Use for weather-related questions.

Use the most appropriate tool.

Do not use web_Search for:
- current date
- current time
- mathematical calculations
- general knowledge questions
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
const Groq_API = async (userMessage) => {
  try {
    if (!userMessage) {
      throw new Error("Message is required");
    }
    const messages = [
      SYSTEM_PROMPT,
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
        messages,
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
    return "Sorry, something went wrong.";
  }
};
export { Groq_API };
