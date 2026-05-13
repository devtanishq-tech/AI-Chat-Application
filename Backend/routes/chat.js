import mongoose from "mongoose";
import express from "express";
import { message, threads } from "../models/OverAllScheam.js";
import authMiddleware from "../middleware/Authmiddleware.js";
const router = express.Router();
//=========================add thread =====================================
router.post("/add", async (req, res) => {
  let messageCreation = {
    content: "Cursor is the Future",
    role: "assistant",
  };
  let dataINsert = await threads.create({
    threadId: "SnowPiercer@123",
    title: "Snowpiercer   has 1024 cars",
    message: [messageCreation],
  });
  console.log(`Message has been successfully created`);
  res.status(200).json({ message: "Message has been successfully created" });
});
//=======================Specific id //============================================================
router.get("/thread/:threadId", authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    console.log(threadId);
    const data = await threads.findOne({ threadId, user: req.user.id });
    if (!data) {
      res.status(401).json({ message: "thread does not exist " });
    }
    console.log(`message data ${data.messages}`);
    res.status(200).json({ messages: data.messages });
  } catch (err) {
    res.status(500).json(`error occur `, err);
  }
});
//==========================================Get all Threads //=====================================
router.get("/thread", authMiddleware, async (req, res) => {
  let find = await threads.find({ user: req.user.id }).sort({ updatedAt: -1 });
  res.send(find);
});
//==============================Delete thread Route =====================================
router.delete("/thread/:threadId", authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    let deletee = await threads.deleteOne({
      threadId,
      user: req.user.id,
    });
    if (!deletee) {
      return res.status(401).json({ message: "data not found " });
    }
    console.log(deletee);
    res.status(200).json({ message: "Data has been successfulyy deleted" });
  } catch (err) {
    res.status(500).json(err.message);
  }
});
export default router;
