/**
 * Speech-to-text provider module.
 *
 * Primary: Cloudflare Workers AI Whisper (`@cf/openai/whisper-large-v3-turbo`)
 * via the Worker's AI binding — near-free at this volume and native to the
 * Cloudflare deployment.
 * Fallback: OpenAI-compatible transcription API (whisper-1), used when the AI
 * binding is unavailable (e.g. some local dev setups) or its call fails.
 *
 * Audio is transcribed in-memory and never stored.
 */

export type TranscribeEnv = {
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
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

async function transcribeWithOpenAI(
  apiKey: string,
  baseUrl: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string> {
  const form = new FormData();
  const ext = contentType.includes('mp4')
    ? 'mp4'
    : contentType.includes('wav')
      ? 'wav'
      : contentType.includes('mpeg')
        ? 'mp3'
        : contentType.includes('ogg')
          ? 'ogg'
          : 'webm';
  form.append(
    'file',
    new File([bytes.buffer as ArrayBuffer], `audio.${ext}`, { type: contentType }),
  );
  form.append('model', 'whisper-1');

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`OpenAI transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { text?: unknown };
  if (typeof data?.text !== 'string') {
    throw new Error('OpenAI returned no transcription text');
  }
  return data.text.trim();
}

/**
 * Transcribe an audio recording to text. Tries Workers AI first, then the
 * OpenAI-compatible API. Throws if both are unavailable or fail.
 */
export async function transcribeAudio(
  env: TranscribeEnv,
  audio: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const bytes = new Uint8Array(audio);
  let primaryError: unknown = null;

  if (env.AI) {
    try {
      return await transcribeWithWorkersAI(env.AI, bytes);
    } catch (err) {
      primaryError = err;
      console.error('Workers AI transcription failed, trying fallback:', err);
    }
  }

  if (env.OPENAI_API_KEY && env.OPENAI_BASE_URL) {
    return await transcribeWithOpenAI(env.OPENAI_API_KEY, env.OPENAI_BASE_URL, bytes, contentType);
  }

  throw primaryError ?? new Error('No transcription provider configured');
}
