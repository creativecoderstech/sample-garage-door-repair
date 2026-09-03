import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
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
         className="phi-chat-launcher fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 h-[var(--phi-control)] w-[var(--phi-control)] rounded-full shadow-2xl glow-primary z-50 p-0 sm:right-[var(--phi-space-4)]"
        aria-label="Open Maya AI-assisted customer care chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return <CustomerCareChatView variant="floating" onClose={() => setIsOpen(false)} />;
}