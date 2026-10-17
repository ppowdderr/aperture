import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { complete, LLMError } from "./client";

const answerSchema = z.object({ answer: z.string() }).strict();

function response(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? true,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function completion(content: string): Response {
  return response({
    choices: [{ message: { content } }],
  });
}

beforeEach(() => {
  vi.stubEnv("LLM_BASE_URL", "https://api.deepseek.com");
  vi.stubEnv("LLM_MODEL", "deepseek-flash");
  vi.stubEnv("LLM_API_KEY", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("complete", () => {
  it("posts an OpenAI-compatible JSON request and parses a valid response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      completion('{"answer":"ready"}'),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply with a status.", answerSchema)).resolves.toEqual({
      answer: "ready",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-secret",
      "content-type": "application/json",
    });
    const body = JSON.parse(String(init.body)) as {
      model: string;
      response_format: { type: string };
      messages: Array<{ content: string }>;
    };
    expect(body.model).toBe("deepseek-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content.toLowerCase()).toContain("json");
  });

  it("retries malformed response content once", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion("not json"))
      .mockResolvedValueOnce(completion('{"answer":"second try"}'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply.", answerSchema)).resolves.toEqual({
      answer: "second try",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a typed error after two malformed responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion("not json"))
      .mockResolvedValueOnce(completion("["));
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply.", answerSchema)).rejects.toMatchObject({
      name: "LLMError",
      code: "invalid_response",
    } satisfies Partial<LLMError>);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries schema mismatches and then throws a typed error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion('{"answer":42}'))
      .mockResolvedValueOnce(completion('{"wrong":"field"}'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply.", answerSchema)).rejects.toMatchObject({
      name: "LLMError",
      code: "invalid_response",
    } satisfies Partial<LLMError>);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry an HTTP failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ error: "upstream" }, { ok: false, status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply.", answerSchema)).rejects.toMatchObject({
      name: "LLMError",
      code: "request",
      status: 503,
    } satisfies Partial<LLMError>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects missing configuration before making a request", async () => {
    vi.stubEnv("LLM_BASE_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(complete("Reply.", answerSchema)).rejects.toMatchObject({
      name: "LLMError",
      code: "configuration",
    } satisfies Partial<LLMError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
