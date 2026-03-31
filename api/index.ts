// Vercel Serverless Entry Point
// This file tells Vercel how to run the Express app.
// dotenv is loaded here for the Vercel environment.
import "dotenv/config";

if (process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY.trim();
}

export { app as default } from "../src/api/server";
