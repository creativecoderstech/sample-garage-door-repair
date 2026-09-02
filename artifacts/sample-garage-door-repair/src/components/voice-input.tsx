import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_SECONDS = 120;

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

function isSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

type Status = 'idle' | 'recording' | 'transcribing';

export function VoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
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
    streamRef.current?.getTracks().forEach((track) => track.stop());
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
        // The recorder may already be inactive.
      }
      cleanupMedia();
    };
  }, []);

  if (!isSupported()) return null;

  const startRecording = async () => {
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
      stream.getTracks().forEach((track) => track.stop());
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
      stream.getTracks().forEach((track) => track.stop());
      setError("Recording isn't supported in this browser — please type instead.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      if (recorderRef.current !== recorder) return;
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const audio = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      cleanupMedia();
      if (unmountedRef.current) return;

      if (audio.size === 0) {
        setStatus('idle');
        setError("Didn't catch any audio — please try again.");
        return;
      }
      if (audio.size > 5 * 1024 * 1024) {
        setStatus('idle');
        setError('Recording was too long — please keep it under 2 minutes.');
        return;
      }

      setStatus('transcribing');
      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': type },
          body: audio,
        });
        const data = (await response.json().catch(() => null)) as
          | { text?: string; error?: string }
          | null;
        if (!response.ok || typeof data?.text !== 'string') {
          throw new Error(data?.error || 'Transcription failed');
        }
        if (data.text.trim()) {
          onTranscript(data.text.trim());
        } else {
          setError("Couldn't hear anything — please try again or type instead.");
        }
      } catch (caught) {
        setError(
          caught instanceof Error && caught.message !== 'Transcription failed'
            ? caught.message
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
      setSeconds((current) => {
        if (current + 1 >= MAX_SECONDS) recorderRef.current?.stop();
        return current + 1;
      });
    }, 1000);
  };

  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {status === 'recording' ? (
        <Button type="button" variant="destructive" onClick={() => recorderRef.current?.stop()}>
          <Square className="w-4 h-4" />
          Stop
          <span className="font-mono text-xs">{elapsed}</span>
        </Button>
      ) : status === 'transcribing' ? (
        <Button type="button" variant="outline" disabled>
          <Loader2 className="w-4 h-4 animate-spin" />
          Transcribing...
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={startRecording}>
          <Mic className="w-4 h-4 text-primary" />
          Speak your job description
        </Button>
      )}
      {status === 'recording' && (
        <span className="text-xs text-muted-foreground">
          Tap Stop when you're done (2 minutes max)
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs font-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}