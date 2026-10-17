import { z } from "zod";

const completionEnvelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

export type LLMErrorCode =
  | "configuration"
  | "request"
  | "invalid_response";

export class LLMError extends Error {
  readonly code: LLMErrorCode;
  readonly status?: number;

  constructor(
    message: string,
    code: LLMErrorCode,
    options: { cause?: unknown; status?: number } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "LLMError";
    this.code = code;
    this.status = options.status;
  }
}

interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

function configFromEnv(): LLMConfig {
  const baseUrl = process.env.LLM_BASE_URL?.trim();
  const model = process.env.LLM_MODEL?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();

  if (!baseUrl || !model) {
    throw new LLMError(
      "LLM_BASE_URL and LLM_MODEL must be configured",
      "configuration",
    );
  }

  return { baseUrl, model, apiKey: apiKey || undefined };
}

function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return base.endsWith("/chat/completions")
    ? base
    : `${base}/chat/completions`;
}

async function requestContent(
  config: LLMConfig,
  prompt: string,
): Promise<string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  let response: Response;
  try {
    response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "user",
            content:
              `${prompt}\n\n` +
              "Respond with one valid json object only. " +
              "Do not wrap it in Markdown or code fences.",
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
  } catch (error) {
    throw new LLMError("LLM request failed", "request", { cause: error });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LLMError(
      `LLM request failed with status ${response.status}`,
      "request",
      {
        status: response.status,
        cause: detail ? new Error(detail) : undefined,
      },
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (error) {
    throw new LLMError(
      "LLM returned a response that was not valid JSON",
      "invalid_response",
      { cause: error },
    );
  }

  const envelope = completionEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new LLMError(
      "LLM response did not contain message content",
      "invalid_response",
      { cause: envelope.error },
    );
  }

  return envelope.data.choices[0].message.content;
}

/**
 * Ask an OpenAI-compatible chat-completions endpoint for a schema-validated
 * JSON object. The first response that is not valid JSON/schema is retried
 * once; transport and configuration failures are not retried.
 */
export async function complete<T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const config = configFromEnv();
  let lastValidationError: z.ZodError<T> | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let content: string;
    try {
      content = await requestContent(config, prompt);
    } catch (error) {
      if (
        error instanceof LLMError &&
        error.code === "invalid_response" &&
        attempt === 0
      ) {
        continue;
      }
      throw error;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      if (attempt === 0) continue;
      throw new LLMError(
        "LLM response was not valid JSON after retry",
        "invalid_response",
      );
    }

    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    lastValidationError = result.error;
    if (attempt === 1) {
      throw new LLMError(
        "LLM response did not match the expected schema after retry",
        "invalid_response",
        { cause: lastValidationError },
      );
    }
  }

  throw new LLMError(
    "LLM response did not match the expected schema after retry",
    "invalid_response",
    { cause: lastValidationError ?? undefined },
  );
}
