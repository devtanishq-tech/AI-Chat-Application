import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { Groq_API } from "./utils/groq.js";
import multer from "multer";
//==================routes folder import //=================================
import chat from "./routes/chat.js";
//=========================MODELS//=====================================
import { User } from "./models/User.js";
import { message, threads } from "./models/OverAllScheam.js";
import { threadId } from "node:worker_threads";
//=============================JWT TOKEN File==///////===============
import Tokengeneration from "./utils/tokenGeneration.js";
//======================================================
//======================Auth middleware//===================
import authMiddleware from "./middleware/Authmiddleware.js";
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
// this is where file come from frontend get stored inside the folder of uploads
const upload = multer({ dest: "uploads/" });
app.use(express.json()); // acting as a body parser
app.use(cookieParser());
app.use(
  // this is acting as a connector between frontend and backend
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-chat-application-snowy.vercel.app",
    ],
    credentials: true,
  }),
);
//====================================Routes Sections===================================
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});
//======================MAIN ROUTES========================================================
app.use("/chat", chat);
app.post(
  "/chat/ai",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      console.log(req.body);
      console.log(req.file); // multipart data or upload file or photo data
      const userMessage = req.body.message;
      const { threadID } = req.body;
      if (!threadID || (!userMessage && !req.file)) {
        return res.status(500).json({ err: "missing required Fields" });
      }
      let threadData = await threads.findOne({
        threadId: threadID,
        user: req.user.id,
      });
      //========================================================================
      // if threadData does not exist then , add  create new Thread acting like a new message
      //=================================================================================================
      // if (!threadData) {
      //   threadData = new threads({
      //     user: req.user.id,
      //     threadId: threadID,
      //     title: userMessage || req.file.originalname,
      //     messages: [
      //       {
      //         role: "user",
      //         content: userMessage || `📎 ${req.file.originalname}`,
      //       },
      //     ],
      //   });
      // } else {
      //   threadData.messages.push({
      //     role: "user",
      //     content: userMessage || `📎 ${req.file.originalname}`,
      //   });
      // }
      if (!threadData) {
        threadData = new threads({
          user: req.user.id,
          threadId: threadID,
          title: userMessage || req.file?.originalname || "New Chat",
          messages: [],
        });
      }
      //============================================================================
      //====================================================================
      let aireply = "";
      if (req.file) {
        aireply = "File Receieved Successfully";
      } else {
        aireply = await Groq_API(userMessage, threadID, req.user.id);
      }
      threadData.messages.push({
        role: "user",
        content: userMessage || `📎 ${req.file.originalname}`,
      });
      threadData.messages.push({
        role: "assistant",
        content: aireply,
      });
      threadData.updatedAt = new Date();
      await threadData.save();
      res.status(200).json({ reply: aireply });
    } catch (err) {
      console.log(err);
      res.status(500).json(err.message);
    }
  },
);
//================================Login and Sign up Routes //===================================
app.post("/signup", async (req, res) => {
  try {
    const { userName, password, email, confirmPassword } = req.body;
    if (!userName || !password || !email || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "All these Fields are required here" });
    }
    if (password != confirmPassword) {
      return res.status(400).json({ message: "Password does not Match" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Existing User" });
    }
    //==============Hash Password here //===============
    const hashPassword = await bcrypt.hash(password, 10);
    //==================================================
    const newUser = await User.create({
      userName,
      password: hashPassword,
      email,
    });
    console.log(newUser);
    const token = Tokengeneration(newUser._id);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "User Data has been added" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err });
  }
});
//==========================================================================================
//=========================================login route =========================
app.post("/login", async (req, res) => {
  try {
    const { userName, email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "All these fileds are required " });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalud creditionals" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Password " });
    }
    const token = Tokengeneration(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Logged in Successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err });
  }
});
app.post("/logout", async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.status(200).json({
      message: "Logout Successful",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
    });
  }
});
app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Authorized go Furhter", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.listen(port, () => {
  console.log(`Port is runnning on ${port}`);
  createConnection();
});
