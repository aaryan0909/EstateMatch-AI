import { ApiRequest, ApiResponse, requireMethod, sendJson } from "./_lib/http";
import { liveAiConfigured } from "./_lib/gemini";

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (!requireMethod(req, res, "GET")) return;
  sendJson(res, 200, { liveAi: liveAiConfigured() });
}
