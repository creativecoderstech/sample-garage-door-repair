/**
 * Speech-to-text provider module.
 *
 * Uses Cloudflare Workers AI Whisper (`@cf/openai/whisper-large-v3-turbo`)
 * via the Worker's AI binding — near-free at this volume and native to the
 * Cloudflare deployment.
 *
 * Audio is transcribed in-memory and never stored.
 */

export type TranscribeEnv = {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
};

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CONTENT_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'video/webm', // some browsers label MediaRecorder output as video/*
  'video/mp4',
];

export function isAllowedAudioType(contentType: string): boolean {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.includes(base);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function transcribeWithWorkersAI(
  ai: NonNullable<TranscribeEnv['AI']>,
  bytes: Uint8Array,
): Promise<string> {
  const result = (await ai.run('@cf/openai/whisper-large-v3-turbo', {
    audio: toBase64(bytes),
  })) as { text?: unknown };
  if (typeof result?.text !== 'string') {
    throw new Error('Workers AI returned no transcription text');
  }
  return result.text.trim();
}

/**
 * Transcribe an audio recording to text using Workers AI.
 * Throws if the AI binding is unavailable or the transcription fails.
 */
export async function transcribeAudio(
  env: TranscribeEnv,
  audio: ArrayBuffer,
  contentType: string,
): Promise<string> {
  if (!env.AI) {
    throw new Error('Workers AI binding is not available');
  }
  const bytes = new Uint8Array(audio);
  return await transcribeWithWorkersAI(env.AI, bytes);
}
