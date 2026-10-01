import { AnalysisResult, ChatMessage, UserPreferences } from "../types";

export type AnalysisMode = "local" | "live";

export class ApiRequestError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const parseApiResponse = async (response: Response): Promise<Record<string, unknown>> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiRequestError("The analysis service returned an unexpected response.", "BAD_RESPONSE");
  }
  return (await response.json()) as Record<string, unknown>;
};

const throwForStatus = async (response: Response): Promise<never> => {
  let message = "The analysis service could not complete the request.";
  let code = "REQUEST_FAILED";
  try {
    const payload = await parseApiResponse(response);
    if (typeof payload.error === "string") message = payload.error;
    if (typeof payload.code === "string") code = payload.code;
  } catch {
    // Keep the generic error above.
  }
  throw new ApiRequestError(message, code);
};

export const fetchLiveAiConfig = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2_500);
    const response = await fetch("/api/config", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timeout);
    if (!response.ok) return false;
    const payload = await parseApiResponse(response);
    return payload.liveAi === true;
  } catch {
    return false;
  }
};

export const analyzeListingRemote = async (
  listingContent: string,
  preferences: UserPreferences,
): Promise<AnalysisResult> => {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ listingContent, preferences }),
  });
  if (!response.ok) await throwForStatus(response);
  const payload = await parseApiResponse(response);
  if (!payload.result || typeof payload.result !== "object") {
    throw new ApiRequestError("Live AI returned an incomplete result.", "BAD_RESPONSE");
  }
  return payload.result as AnalysisResult;
};

export const chatRemote = async (
  listingContent: string,
  history: ChatMessage[],
  message: string,
): Promise<string> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ listingContent, history, message }),
  });
  if (!response.ok) await throwForStatus(response);
  const payload = await parseApiResponse(response);
  if (typeof payload.text !== "string" || !payload.text.trim()) {
    throw new ApiRequestError("Live AI returned an empty chat response.", "BAD_RESPONSE");
  }
  return payload.text;
};
