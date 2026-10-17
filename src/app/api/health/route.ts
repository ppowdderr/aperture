import mongoose from "mongoose";
import { connection } from "next/server";
import { connectDb } from "@/lib/db";

export async function GET(): Promise<Response> {
  await connection();

  try {
    await connectDb();
    return Response.json({
      ok: true,
      mongo: "up",
      model: mongoose.version,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MONGODB_URI missing") {
      return Response.json(
        { ok: false, error: "MONGODB_URI missing" },
        { status: 500 },
      );
    }

    return Response.json(
      {
        ok: false,
        mongo: "down",
        model: mongoose.version,
      },
      { status: 200 },
    );
  }
}
