import { useGetAvailability, useAskGarageAssistant } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

export function AssistantChat() {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, safety?: string, service?: string}[]>([
    {
      role: 'assistant',
      content: 'Hi, I can help you figure out what might be wrong with your garage door and whether it is safe to operate. What seems to be the problem?'
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const askMutation = useAskGarageAssistant();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  return (
    <div className="flex flex-col h-[500px] border rounded-xl overflow-hidden bg-card shadow-sm">
      <div className="bg-primary p-4 text-primary-foreground flex items-center gap-3">
        <div className="bg-primary-foreground/20 p-2 rounded-full">
           <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Diagnostic Assistant</h3>
          <p className="text-xs text-primary-foreground/80">AI-powered safety check</p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl p-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-muted text-muted-foreground rounded-tl-sm'
              }`}>
                {msg.safety && msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/10 font-medium text-xs">
                    {getSafetyIcon(msg.safety)}
                    <span className="uppercase tracking-wider">
                      {msg.safety === 'urgent' ? 'DO NOT OPERATE DOOR' : 
                       msg.safety === 'caution' ? 'Use Caution' : 'Likely Safe'}
                    </span>
                  </div>
                )}
                
                <p className="text-sm leading-relaxed">{msg.content}</p>
                
                {msg.service && msg.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-border/10 text-xs font-semibold opacity-80">
                    Suggested: {msg.service}
                  </div>
                )}
              </div>
            </div>
          ))}
          {askMutation.isPending && (
             <div className="flex gap-3 justify-start">
               <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                 <Bot className="h-4 w-4 text-secondary-foreground" />
               </div>
               <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
               </div>
             </div>
          )}
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSend} className="p-3 bg-background border-t flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="e.g. My door won't close and makes a grinding noise..."
          className="flex-1 bg-muted/50 border-transparent focus-visible:bg-background"
          disabled={askMutation.isPending}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || askMutation.isPending} className="shrink-0 rounded-full">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
