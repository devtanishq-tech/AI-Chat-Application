import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";

import { Groq_API } from "./utils/groq.js";
import chat from "./routes/chat.js";
import { message, threads } from "./models/OverAllScheam.js";
import { threadId } from "node:worker_threads";

dotenv.config(); // this enabels us to use .env file data
//=================================Mongo DB Connection =======================================
const createConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connection has been successfully created");
  } catch (err) {
    console.log(`There is some error `, err);
  }
};
//=================================================================================================

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const app = express();
const port = 8080 || process.env.port;
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "ai-chat-application-snowy.vercel.app"],
    credentials: true,
  }),
);
//====================================Routes Sections===================================
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});
app.use("/chat", chat);
app.post("/chat/ai", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const { threadID } = req.body;
    if (!threadID || !userMessage) {
      return res.status(500).json({ err: "missing required Fields" });
    }
    let threadData = await threads.findOne({ threadId: threadID });
    //========================================================================
    // if threadData does not exist then , add  create new Thread acting like a new message
    if (!threadData) {
      threadData = new threads({
        threadId: threadID,
        title: userMessage,
        messages: [{ role: "user", content: userMessage }],
      });
    } else {
      threadData.messages.push({ role: "user", content: userMessage });
    }
    //====================================================================
    const response = await Groq_API(userMessage);
    threadData.messages.push({ role: "assistant", content: response });
    threadData.updatedAt = new Date();
    await threadData.save();
    res.status(200).json({ reply: response });
  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
});

app.listen(port, () => {
  console.log(`Port is runnning on ${port}`);
  createConnection();
});
