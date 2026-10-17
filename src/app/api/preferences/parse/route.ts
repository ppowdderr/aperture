import { connection } from "next/server";
import { z } from "zod";
import { LLMError } from "@/lib/llm/client";
import { parsePreferences } from "@/lib/llm/preferences";

const requestSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  await connection();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid preference request",
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const preferences = await parsePreferences(parsed.data.text);
    if (Object.keys(preferences).length === 0) {
      return Response.json(
        { error: "I couldn't find a timetable preference in that sentence." },
        { status: 422 },
      );
    }
    return Response.json(preferences);
  } catch (error) {
    console.error(
      "[api/preferences/parse] failed:",
      error instanceof LLMError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "unknown error",
    );
    return Response.json(
      { error: "The preference parser is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
