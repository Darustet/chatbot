import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: '../.env' });

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  // Use stderr instead of stdout so this message does not get included
// in the abstract text returned by runner.js.
  console.error("MongoDB connected");
};

export default connectDB;