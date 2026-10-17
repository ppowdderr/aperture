import mongoose from "mongoose";

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  logged: boolean;
}

const globalForMongoose = globalThis as typeof globalThis & {
  apertureMongoose?: MongooseCache;
};

const cache =
  globalForMongoose.apertureMongoose ??
  (globalForMongoose.apertureMongoose = {
    connection: null,
    promise: null,
    logged: false,
  });

/** Open one shared Mongoose connection per process, including across Next.js hot reloads. */
export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  if (cache.connection) return;

  if (!cache.promise) {
    if (!cache.logged) {
      console.info("[db] connecting to MongoDB");
      cache.logged = true;
    }
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      dbName: "aperture",
    });
  }

  try {
    cache.connection = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
