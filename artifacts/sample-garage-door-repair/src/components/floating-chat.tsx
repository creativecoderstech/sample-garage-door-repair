import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerCareChatView } from "@/components/customer-care-chat-view";

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl glow-primary z-50 p-0"
        aria-label="Open customer care chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return <CustomerCareChatView variant="floating" onClose={() => setIsOpen(false)} />;
}