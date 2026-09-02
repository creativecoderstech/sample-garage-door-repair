import { useState, useRef, useEffect } from "react";
import { useAskGarageAssistant } from "@workspace/api-client-react";
import { Send, Bot, Loader2, AlertTriangle, ShieldCheck, Info, MessageSquare, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  safety?: string;
  service?: string;
};

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("garage_chat_messages");
      if (saved) return JSON.parse(saved);
    }
    return [{
      role: 'assistant',
      content: 'Hi! I can help diagnose garage door issues and verify if it’s safe to operate. What seems to be the problem?'
    }];
  });
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const askMutation = useAskGarageAssistant();

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("garage_chat_messages", JSON.stringify(messages));
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || askMutation.isPending) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput("");

    askMutation.mutate(
      { data: { message: userMessage } },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.reply,
            safety: data.safetyLevel,
            service: data.suggestedService
          }]);
        }
      }
    );
  };

  const getSafetyIcon = (level?: string) => {
    switch(level) {
      case 'urgent': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'caution': return <Info className="h-5 w-5 text-amber-500" />;
      case 'safe': return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
      default: return null;
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl glow-primary z-50 p-0"
        aria-label="Open diagnostic chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-[360px] sm:max-w-[400px] bg-card border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden transform transition-all duration-300">
      <div className="bg-primary p-4 text-primary-foreground flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/20 p-2 rounded-full">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Diagnostic Assistant</h3>
            <p className="text-xs text-primary-foreground/80">AI-powered safety check</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-primary-foreground/70 hover:text-primary-foreground p-1 transition-colors"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
      
      <ScrollArea className="h-[380px] p-4 bg-muted/10" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
              
              <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-card border border-border text-card-foreground rounded-tl-sm'
              }`}>
                {msg.safety && msg.role === 'assistant' && (
                  <div className={`flex items-center gap-2 mb-2 pb-2 border-b font-bold text-xs ${
                    msg.safety === 'urgent' ? 'text-destructive border-destructive/20' : 
                    msg.safety === 'caution' ? 'text-amber-600 border-amber-500/20' : 
                    'text-emerald-600 border-emerald-500/20'
                  }`}>
                    {getSafetyIcon(msg.safety)}
                    <span className="uppercase tracking-wider">
                      {msg.safety === 'urgent' ? 'DO NOT OPERATE DOOR' : 
                       msg.safety === 'caution' ? 'Use Caution' : 'Likely Safe'}
                    </span>
                  </div>
                )}
                
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                
                {msg.service && msg.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-border/50 text-xs font-semibold text-muted-foreground">
                    Suggested: <span className="text-foreground">{msg.service}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {askMutation.isPending && (
             <div className="flex gap-3 justify-start">
               <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                 <Bot className="h-4 w-4 text-secondary-foreground" />
               </div>
               <div className="bg-card border rounded-2xl rounded-tl-sm p-4 flex items-center shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
               </div>
             </div>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSend} className="p-3 bg-card border-t flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="e.g. Grinding noise when closing..."
          className="flex-1 bg-muted focus-visible:bg-background transition-colors"
          disabled={askMutation.isPending}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || askMutation.isPending} className="shrink-0 rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}