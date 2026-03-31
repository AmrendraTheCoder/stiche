// src/lib/db.ts
// Singleton MongoDB client — reused across Vercel serverless invocations.
// On local dev, it reconnects per request (fine for dev volumes).

import { MongoClient, Collection, Document } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "";

let client: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (client) return client;
  if (!MONGO_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it in Vercel Dashboard > Settings > Environment Variables."
    );
  }
  client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

export async function getOrdersCollection(): Promise<Collection<Document>> {
  const c = await getClient();
  return c.db("stiche").collection("orders");
}
