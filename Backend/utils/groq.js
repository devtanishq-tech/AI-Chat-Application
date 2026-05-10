import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const Groq_API = async (message) => {
  try {
    if (!message) {
      throw new Error("Message does not exist");
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
You are a smart and concise AI assistant.

Rules:
- Give short and direct answers for simple questions
- Do not over-explain basic topics
- Keep normal responses under 80 words
- If user asks coding questions:
  - provide complete working code
  - add short explanation
  - use markdown formatting
- If user asks for detailed explanation, then explain deeply
- Avoid unnecessary text
- Be clear, helpful, and natural like ChatGPT
- Never truncate code responses
`,
        },
        {
          role: "user",
          content: message,
        },
      ],

      model: "llama-3.3-70b-versatile",

      temperature: 0.7,

      max_tokens: 1000,
    });

    const response = chatCompletion.choices[0]?.message?.content;

    console.log(response);

    return response;
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};

export { Groq_API };
