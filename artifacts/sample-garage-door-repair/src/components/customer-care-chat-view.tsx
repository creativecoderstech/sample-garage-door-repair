import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Info, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CUSTOMER_CARE_NAME, useCustomerCareChat, type CustomerCareMessage } from "@/components/customer-care-chat";

type CustomerCareChatViewProps = {
  variant: "floating" | "page";
  onClose?: () => void;
};

function SafetyBadge({ level }: { level: CustomerCareMessage["safety"] }) {
  if (!level || level === "safe") return null;
  const isUrgent = level === "urgent";
  return (
    <div
      className={`mb-2 flex items-center gap-2 border-b pb-2 text-xs font-bold ${
        isUrgent
          ? "border-destructive/20 text-destructive"
          : "border-amber-500/20 text-amber-600"
      }`}
    >
      {isUrgent ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
      <span className="uppercase tracking-wider">
        {isUrgent ? "Do not operate door" : "Use caution"}
      </span>
    </div>
  );
}

export function CustomerCareChatView({ variant, onClose }: CustomerCareChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const chat = useCustomerCareChat();
  const isFloating = variant === "floating";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [chat.messages, chat.isPending]);

  const renderMessage = (message: CustomerCareMessage, index: number): ReactNode => (
    <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          M
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" aria-label="Maya is available" />
        </div>
      )}
      <div
        className={`phi-card max-w-[85%] p-[var(--phi-space-2)] shadow-sm ${
          message.role === "user"
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border border-border bg-card text-card-foreground"
        }`}
      >
        {message.role === "assistant" && <SafetyBadge level={message.safety} />}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        {message.service && message.role === "assistant" && message.service !== "Service assessment" && (
          <div className="mt-3 border-t border-border/50 pt-2 text-xs font-semibold text-muted-foreground">
            I’d start with: <span className="text-foreground">{message.service}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={
        isFloating
          ? "phi-card fixed bottom-[var(--phi-space-2)] left-[var(--phi-space-2)] right-[var(--phi-space-2)] z-50 flex max-w-[25.956rem] flex-col overflow-hidden border bg-card shadow-2xl sm:bottom-[var(--phi-space-4)] sm:left-auto sm:right-[var(--phi-space-4)] sm:w-full"
          : "phi-card flex h-[500px] flex-col overflow-hidden border bg-card shadow-sm"
      }
    >
      <div className="flex items-center justify-between bg-primary p-[var(--phi-space-3)] text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary-foreground/20 p-2">
            <span className="text-sm font-bold" aria-hidden="true">M</span>
          </div>
          <div>
            <h3 className="text-sm font-bold">{CUSTOMER_CARE_NAME}</h3>
            <p className="text-xs text-primary-foreground/80">Customer care at {chat.businessName}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer care chat"
            className="p-1 text-primary-foreground/70 transition-colors hover:text-primary-foreground"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>

      <ScrollArea className={`p-[var(--phi-space-3)] ${isFloating ? "h-[380px] bg-muted/10" : "flex-1"}`} ref={scrollRef}>
        <div className="space-y-[var(--phi-space-3)]">
          {chat.messages.map(renderMessage)}
          {chat.isPending && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <span className="text-xs font-bold text-secondary-foreground" aria-hidden="true">M</span>
              </div>
              <div className="flex items-center rounded-[var(--phi-radius)] rounded-tl-sm border bg-card p-[var(--phi-space-3)] shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {chat.hasUserMessages && !chat.isPending && (
        <div className="border-t bg-card px-3 py-3">
          <Button type="button" onClick={chat.startServiceRequest} className="w-full font-bold">
             Share details with our team
          </Button>
           <p className="mt-1.5 text-center text-[11px] text-muted-foreground">I’ll carry this conversation into the request form.</p>
        </div>
      )}

      <form onSubmit={chat.sendMessage} className="flex gap-[var(--phi-space-2)] border-t bg-card p-[var(--phi-space-2)]">
        <Input
          value={chat.input}
          onChange={(event) => chat.setInput(event.target.value)}
           placeholder={isFloating ? "Tell Maya what’s happening..." : "Tell Maya what’s happening..."}
          className="flex-1 bg-muted focus-visible:bg-background"
          disabled={chat.isPending}
          aria-label="Message customer care"
        />
        <Button type="submit" size="icon" disabled={!chat.input.trim() || chat.isPending} className="shrink-0 rounded-full" aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}