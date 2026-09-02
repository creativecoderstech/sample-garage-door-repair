import express, { Router, type IRouter } from "express";
import {
  ensureCompatibleFormat,
  speechToText,
} from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
]);
const requestCounts = new Map<string, { count: number; resetsAt: number }>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientId);
  if (!current || current.resetsAt <= now) {
    requestCounts.set(clientId, { count: 1, resetsAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

router.post(
  "/transcribe",
  express.raw({ type: [...ALLOWED_AUDIO_TYPES], limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    if (isRateLimited(req.ip ?? req.socket.remoteAddress ?? "unknown")) {
      res.status(429).json({
        error: "Too many recordings. Please wait a few minutes or type instead.",
      });
      return;
    }

    const contentType = req.headers["content-type"]?.split(";")[0]?.trim() ?? "";
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      res.status(415).json({ error: "Unsupported audio format." });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "No audio was received." });
      return;
    }

    try {
      const audio = await ensureCompatibleFormat(req.body);
      const text = await speechToText(audio.buffer, audio.format);
      res.json({ text: text.trim() });
    } catch (error) {
      req.log.error({ error }, "Audio transcription failed");
      res.status(502).json({
        error: "Couldn't transcribe that recording. Please try again or type instead.",
      });
    }
  },
);

export default router;