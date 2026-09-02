/**
 * Optional voice-to-text control for textareas.
 *
 * Tap the mic to record (MediaRecorder), tap stop to finish; the audio is
 * sent to /api/transcribe (Workers AI Whisper) and the resulting text is
 * handed to the parent via onTranscript. Renders nothing when the browser
 * cannot record. Recordings are capped at 2 minutes and never stored.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square } from 'lucide-react';

const MAX_SECONDS = 120;

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

type Status = 'idle' | 'recording' | 'transcribing';

export function VoiceInput({
  onTranscript,
  label = 'your message',
  testId = 'button-voice-input',
}: {
  onTranscript: (text: string) => void;
  /** Used in helper copy, e.g. "Speak your review". */
  label?: string;
  testId?: string;
}) {
  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);
  const unmountedRef = useRef(false);

  const cleanupMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        // recorder may already be inactive
      }
      cleanupMedia();
    };
  }, []);

  if (!isSupported()) return null;

  const startRecording = async () => {
    // Synchronous in-flight guard: ignore taps while a start is pending or a
    // recorder already exists (prevents multiple recorders/streams racing).
    if (startingRef.current || recorderRef.current) return;
    startingRef.current = true;
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      startingRef.current = false;
      setError('Microphone access was blocked — you can keep typing instead.');
      return;
    }
    if (unmountedRef.current) {
      startingRef.current = false;
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      startingRef.current = false;
      stream.getTracks().forEach((t) => t.stop());
      setError("Recording isn't supported on this browser — please type instead.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      // Only the recorder we still own may finish; stale recorders bail out.
      if (recorderRef.current !== recorder) return;
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      cleanupMedia();
      if (unmountedRef.current) return;

      if (blob.size === 0) {
        setStatus('idle');
        setError("Didn't catch any audio — please try again.");
        return;
      }
      if (blob.size > 5 * 1024 * 1024) {
        setStatus('idle');
        setError('Recording was too long — please keep it under 2 minutes.');
        return;
      }

      setStatus('transcribing');
      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': type },
          body: blob,
        });
        const data = (await res.json().catch(() => null)) as
          | { text?: string; error?: string }
          | null;
        if (!res.ok || typeof data?.text !== 'string') {
          throw new Error(data?.error || 'Transcription failed');
        }
        if (data.text.trim()) {
          onTranscript(data.text.trim());
        } else {
          setError("Couldn't hear anything — please try again or type instead.");
        }
      } catch (err) {
        setError(
          err instanceof Error && err.message !== 'Transcription failed'
            ? err.message
            : "Couldn't transcribe that — please try again or type instead.",
        );
      } finally {
        setStatus('idle');
      }
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    setSeconds(0);
    setStatus('recording');
    recorder.start();
    startingRef.current = false;
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          recorderRef.current?.stop();
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === 'recording' ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          data-testid={`${testId}-stop`}
          className="min-h-[2.75rem]"
        >
          <Square className="w-4 h-4 mr-1.5" />
          Stop
          <span className="ml-2 flex items-center gap-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden />
            {mmss}
          </span>
        </Button>
      ) : status === 'transcribing' ? (
        <Button type="button" variant="outline" size="sm" disabled className="min-h-[2.75rem]">
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          Transcribing...
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startRecording}
          data-testid={testId}
          className="min-h-[2.75rem]"
        >
          <Mic className="w-4 h-4 mr-1.5 text-primary" />
          Speak {label}
        </Button>
      )}
      {status === 'recording' ? (
        <span className="text-xs text-muted-foreground">Tap Stop when you're done (2 min max)</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-destructive font-medium">
          {error}
        </span>
      ) : null}
    </div>
  );
}
