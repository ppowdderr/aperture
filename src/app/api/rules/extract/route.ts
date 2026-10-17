import { connection } from "next/server";
import { z } from "zod";
import { loadProgramme } from "@/lib/data";
import { LLMError } from "@/lib/llm/client";
import { extractRules } from "@/lib/llm/rules";
import { ruleSchema } from "@/lib/schemas";

const requestSchema = z
  .object({
    programmeCode: z.string().regex(/^[A-Z0-9]+$/),
    year: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
  })
  .strict();

function isMissingDataFile(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    cause instanceof Error &&
    "code" in cause &&
    (cause as NodeJS.ErrnoException).code === "ENOENT"
  );
}

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
        error: "Invalid rules request",
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  let programme;
  try {
    const years = loadProgramme(parsed.data.programmeCode);
    programme = years.find((year) => year.year === parsed.data.year);
  } catch (error) {
    if (isMissingDataFile(error)) {
      return Response.json(
        { error: `Unknown programme: ${parsed.data.programmeCode}` },
        { status: 404 },
      );
    }
    console.error(
      "[api/rules/extract] programme load failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return Response.json(
      { error: "Unable to load programme notes" },
      { status: 500 },
    );
  }

  if (!programme) {
    return Response.json(
      {
        error: `${parsed.data.programmeCode} has no year ${parsed.data.year}`,
      },
      { status: 404 },
    );
  }

  try {
    const rules = ruleSchema.array().parse(await extractRules(programme));
    return Response.json({ rules });
  } catch (error) {
    console.error(
      "[api/rules/extract] failed:",
      error instanceof LLMError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "unknown error",
    );
    return Response.json(
      { error: "The rule extractor is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
