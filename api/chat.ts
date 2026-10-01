import { ChatMessage } from "../types.js";
import {
  ApiRequest,
  ApiResponse,
  clientIp,
  readJsonBody,
  requireMethod,
  requireSameOrigin,
  sendJson,
} from "./_lib/http.js";
import { chatWithGemini, liveAiConfigured } from "./_lib/gemini.js";
import { rateLimit } from "./_lib/rateLimit.js";
import { sanitizeListing } from "./_lib/validate.js";

interface ChatBody {
  listingContent?: unknown;
  message?: unknown;
  history?: unknown;
}

const sanitizeHistory = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-10)
    .filter(
      (item): item is ChatMessage =>
        Boolean(item) &&
        typeof item === "object" &&
        ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "model") &&
        typeof (item as ChatMessage).text === "string",
    )
    .map((item) => ({ role: item.role, text: item.text.substring(0, 2_000) }));
};

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requireMethod(req, res, "POST")) return;
  if (!requireSameOrigin(req, res)) return;

  const limit = await rateLimit("chat", clientIp(req), 20);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    sendJson(res, 429, { error: "Too many chat requests. Try again shortly.", code: "RATE_LIMITED" });
    return;
  }

  if (!liveAiConfigured()) {
    sendJson(res, 501, {
      error: "Live AI chat is not configured on the server.",
      code: "LIVE_AI_NOT_CONFIGURED",
    });
    return;
  }

  const body = await readJsonBody<ChatBody>(req);
  const listingContent = sanitizeListing(body?.listingContent, 30_000);
  const message = typeof body?.message === "string" ? body.message.trim().substring(0, 1_000) : "";
  if (!listingContent || !message) {
    sendJson(res, 400, { error: "Listing text and a chat message are required.", code: "INVALID_CHAT" });
    return;
  }

  try {
    const text = await chatWithGemini(listingContent, sanitizeHistory(body?.history), message);
    sendJson(res, 200, { text, mode: "live" });
  } catch (error) {
    console.error("Live chat failed", error);
    sendJson(res, 502, {
      error: "Live AI chat failed. Local listing answers are still available.",
      code: "LIVE_AI_FAILED",
    });
  }
}
