import mongoose from "mongoose";
import { Schema } from "mongoose";
const UserScheam = new Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true, // this will keey track when it was created and when it was updated
  },
);
const User = mongoose.model("User", UserScheam);
export { User };
