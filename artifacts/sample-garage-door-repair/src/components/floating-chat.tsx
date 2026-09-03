import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerCareChatView } from "@/components/customer-care-chat-view";

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!isOpen && hasOpened.current) launcherRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button
        ref={launcherRef}
        onClick={() => {
          hasOpened.current = true;
          setIsOpen(true);
        }}
        className="phi-chat-launcher fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-50 h-14 w-14 gap-3 rounded-full border border-primary/40 bg-primary p-0 text-primary-foreground shadow-2xl glow-primary transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-2xl focus-visible:ring-ring focus-visible:ring-offset-2 sm:right-[var(--phi-space-4)] sm:w-auto sm:min-w-[13rem] sm:px-6"
        aria-label="Open Maya’s customer-care chat"
        title="Ask Maya a question"
      >
        <span className="phi-chat-icon relative flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
          <MessageCircle className="h-7 w-7 stroke-[2.2]" />
          <Sparkles className="absolute -right-2 -top-2 h-4 w-4 fill-accent text-accent-foreground drop-shadow-sm" />
        </span>
        <span className="hidden font-display text-base font-bold sm:inline">Ask a Question</span>
      </Button>
    );
  }

  return <CustomerCareChatView variant="floating" onClose={() => setIsOpen(false)} />;
}