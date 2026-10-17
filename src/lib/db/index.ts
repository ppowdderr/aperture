import mongoose from "mongoose";

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  logged: boolean;
  /** When the last connection attempt failed; callers fall back to JSON without retrying for RETRY_AFTER_MS. */
  failedAt: number | null;
}

const CONNECT_TIMEOUT_MS = 2000;
const RETRY_AFTER_MS = 60_000;

const globalForMongoose = globalThis as typeof globalThis & {
  apertureMongoose?: MongooseCache;
};

const cache =
  globalForMongoose.apertureMongoose ??
  (globalForMongoose.apertureMongoose = {
    connection: null,
    promise: null,
    logged: false,
    failedAt: null,
  });

/** Open one shared Mongoose connection per process, including across Next.js hot reloads. */
export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  if (cache.connection) return;
  if (cache.failedAt !== null && Date.now() - cache.failedAt < RETRY_AFTER_MS) throw new Error("MongoDB unavailable (recent failure)");

  if (!cache.promise) {
    if (!cache.logged) {
      console.info("[db] connecting to MongoDB");
      cache.logged = true;
    }
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      dbName: "aperture",
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
    });
  }

  try {
    cache.connection = await cache.promise;
    cache.failedAt = null;
  } catch (error) {
    cache.promise = null;
    cache.failedAt = Date.now();
    throw error;
  }
}
