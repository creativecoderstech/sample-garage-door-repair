import { useState, useRef, useEffect, type FormEvent, type ReactElement } from 'react';
import {
  useCreateChatInquiry,
  useSendChatMessage,
  type ChatMessage,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

const SESSION_KEY = 'sample-handyman-chat-inquiry';

type SessionInquiry = {
  id: number;
  name: string;
};

/**
 * Matches either a markdown link [text](url) or a bare http(s) URL.
 * Groups: 1 = markdown label, 2 = markdown url, 3 = bare url.
 */
const LINK_REGEX =
  /\[([^\]]+)\]\(\s*((?:https?:\/\/|\/?#)[^\s)]+)\s*\)|(https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,!?;:])/g;

/** Any way Sarah might write the booking link — full URL, relative, or hash. */
export function isBookingLink(url: string): boolean {
  return url.includes('#booking');
}

/**
 * Render plain text with markdown links and bare URLs as clickable anchors.
 * Booking links always navigate to the local booking form (/#booking) with
 * short action text; other URLs open in a new tab.
 */
export function linkifyText(text: string, onBookingClick?: () => void) {
  const nodes: Array<string | ReactElement> = [];
  let last = 0;
  const re = new RegExp(LINK_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const label = m[1];
    const url = m[2] ?? m[3];
    if (isBookingLink(url)) {
      nodes.push(
        <a
          key={nodes.length}
          href="/#booking"
          onClick={onBookingClick}
          className="underline underline-offset-2 font-semibold text-primary hover:text-accent"
          data-testid="chat-booking-link"
        >
          {label ?? 'Request a Quote'}
        </a>,
      );
    } else {
      nodes.push(
        <a
          key={nodes.length}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all text-primary hover:text-accent"
        >
          {label ?? url}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function greetingFor(name: string): ChatMessage {
  return {
    role: 'assistant',
    content: `Hey ${name}! I'm Sarah from Mike's Handyman Service. I can help answer questions about services, pricing, scheduling, or anything else. What can I help you with today?`,
  };
}

function readSession(): SessionInquiry | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionInquiry;
    if (
      parsed &&
      typeof parsed.id === 'number' &&
      typeof parsed.name === 'string' &&
      parsed.name.trim()
    ) {
      return { id: parsed.id, name: parsed.name.trim() };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeSession(inquiry: SessionInquiry) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(inquiry));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const session = readSession();
  const [inquiryId, setInquiryId] = useState<number | null>(session?.id ?? null);
  const [visitorName, setVisitorName] = useState(session?.name ?? '');
  const [nameInput, setNameInput] = useState(session?.name ?? '');
  const [phoneInput, setPhoneInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    session ? [greetingFor(session.name)] : [],
  );
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const sendMessage = useSendChatMessage();
  const createInquiry = useCreateChatInquiry();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    if (inquiryId) {
      inputRef.current?.focus();
    } else {
      nameRef.current?.focus();
    }
  }, [isOpen, inquiryId]);

  const PHONE_RE = /^\(\d{3}\) \d{3}-\d{4}$/;

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  const startChat = (e: FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) {
      setFormError('Please enter your name to start chatting.');
      return;
    }
    if (name.length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }
    const phone = phoneInput.trim();
    if (phone && !PHONE_RE.test(phone)) {
      setFormError('Enter a valid phone number — e.g. (555) 123-4567.');
      return;
    }
    setFormError(null);

    createInquiry.mutate(
      {
        data: {
          name,
          ...(phone ? { phone } : {}),
        },
      },
      {
        onSuccess: (inquiry) => {
          const started = { id: inquiry.id, name: inquiry.name };
          writeSession(started);
          setInquiryId(inquiry.id);
          setVisitorName(inquiry.name);
          setMessages([greetingFor(inquiry.name)]);
        },
        onError: () => {
          setFormError('Could not start chat. Please try again.');
        },
      },
    );
  };

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sendMessage.isPending || inquiryId == null) return;

    const userMessage: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    sendMessage.mutate(
      { data: { messages: newMessages, inquiryId } },
      {
        onSuccess: (response) => {
          if (response.inquiryOrphaned) {
            // The stored session referenced a deleted inquiry — the server answered
            // the AI but wrote nothing to the DB.  Reset to the name form so the
            // visitor creates a real inquiry on their next message.
            clearSession();
            setInquiryId(null);
            setMessages([]);
            setVisitorName('');
            setFormError(
              'Your previous session has expired. Please enter your name to start a new chat.',
            );
            return;
          }
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response.reply },
          ]);
        },
        onError: () => {
          // Drop a broken session so the next open starts clean.
          clearSession();
          setInquiryId(null);
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                "Sorry, I'm having trouble connecting right now. Close chat and open it again to retry, or use the booking form / call Mike.",
            },
          ]);
        },
      },
    );
  };

  const quickQuestions = [
    "What's your hourly rate?",
    'How quickly can you respond?',
    'Do you offer free estimates?',
    'What areas do you serve?',
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[5.5rem] md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-5 py-4 md:px-7 rounded-full shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] transition-all hover:scale-105 active:scale-95 font-display font-bold group glow-primary"
        data-testid="button-open-chat"
        aria-label="Open chat"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6" />
          <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-accent animate-pulse" />
        </div>
        <span className="hidden sm:inline">Ask a Question</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-[5.5rem] md:bottom-6 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] bg-card border-2 border-card-border rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5"
      style={{ maxHeight: 'calc(100vh - 8rem)' }}
      data-testid="widget-chat"
    >
      <div className="relative bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-6 py-5 border-b border-primary-border overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Chat with us</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <p className="text-xs opacity-90 font-semibold">
                  {inquiryId
                    ? `Chatting as ${visitorName}`
                    : 'Usually replies instantly'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-primary-foreground/10 p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95"
            data-testid="button-close-chat"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {inquiryId == null ? (
        <form
          onSubmit={startChat}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-gradient-to-b from-background to-muted/20"
          data-testid="chat-intake-form"
        >
          <div>
            <p className="font-display font-bold text-lg mb-1">Before we chat</p>
            <p className="text-sm text-muted-foreground">
              Share your name so Mike can follow up. Phone is optional.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-name">Name</Label>
            <Input
              ref={nameRef}
              id="chat-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              required
              disabled={createInquiry.isPending}
              data-testid="input-chat-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chat-phone">
              Contact number <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="chat-phone"
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
              placeholder="(512) 244-8550"
              maxLength={14}
              disabled={createInquiry.isPending}
              data-testid="input-chat-phone"
            />
          </div>
          {formError && (
            <p className="text-sm text-destructive font-medium" role="alert">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            disabled={createInquiry.isPending || !nameInput.trim()}
            className="w-full font-display font-bold"
            data-testid="button-start-chat"
          >
            {createInquiry.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start chat'
            )}
          </Button>
        </form>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 bg-gradient-to-b from-background to-muted/20">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                style={{ animationDelay: `${i * 50}ms` }}
                data-testid={`message-${message.role}-${i}`}
              >
                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl shadow-md ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md'
                      : 'bg-card border-2 border-card-border text-card-foreground rounded-bl-md'
                  }`}
                >
                  <p className="text-sm leading-relaxed font-medium">
                    {linkifyText(message.content, () => setIsOpen(false))}
                  </p>
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-card border-2 border-card-border px-5 py-4 rounded-2xl rounded-bl-md flex items-center gap-3 shadow-md">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="px-6 py-4 border-t-2 border-border bg-muted/30">
              <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wide">
                Quick Questions
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.slice(0, 2).map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-xs font-semibold px-4 py-2 bg-background border-2 border-border rounded-full hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all hover:scale-105 active:scale-95"
                    data-testid={`button-quick-question-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-4 border-t-2 border-border bg-card">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 px-5 py-3 bg-background border-2 border-input rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
                disabled={sendMessage.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || sendMessage.isPending}
                size="icon"
                className="rounded-2xl shrink-0 w-12 h-12 shadow-lg hover:shadow-xl magnetic-hover"
                data-testid="button-send-message"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
