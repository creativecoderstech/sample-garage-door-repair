import { useEffect, useRef, useState } from "react";
import { useAskGarageAssistant, useGetPublicBusinessSettings } from "@workspace/api-client-react";
import type { AssistantInput, AssistantReply } from "@workspace/api-client-react";
import { navigateToPublicSection } from "@/lib/public-navigation";
import { getInvisibleTurnstileToken } from "@/lib/cloudflare-turnstile";

export type CustomerCareMessage = {
  role: "user" | "assistant";
  content: string;
  safety?: AssistantReply["safetyLevel"];
  service?: string;
  showServiceRequestLink?: boolean;
};

export type ServiceRequestDraft = {
  service: string;
  urgency: "emergency" | "soon" | "flexible";
  details: string;
};

export const CUSTOMER_CARE_NAME = "Maya";
export const SERVICE_REQUEST_DRAFT_EVENT = "garage-service-request-draft";

export const customerCareWelcome = (businessName = "Garage Door Service Preview") =>
  `Hi, I’m Maya with the customer-care team at ${businessName}. Tell me what your garage door is doing and I’ll help point you toward the right service and the safest next step. The business will confirm coverage, timing, and any appointment.`;

function isCustomerCareWelcome(content: string) {
  return /Maya(?:, an AI-assisted customer-care guide| from | with )/i.test(content);
}

function shouldOfferServiceRequestLink(
  reply: string,
  service: string,
  safety: AssistantReply["safetyLevel"],
) {
  if (service !== "Service assessment" || safety === "urgent") return true;
  return /service request|(?:start|submit|send|create|make)\s+(?:a\s+)?(?:service\s+)?request|request\s+(?:service|help)|(?:arrange|contact|reach out to)\s+(?:professional help|the team|a technician)/i.test(reply);
}

const storageKey = "garage_customer_care_messages";
const MIN_TYPING_DURATION_MS = 900;
const MAX_TYPING_DURATION_MS = 1800;

function typingDurationFor(reply: string) {
  return Math.min(
    MAX_TYPING_DURATION_MS,
    Math.max(MIN_TYPING_DURATION_MS, 700 + reply.length * 7),
  );
}

function readSavedMessages(): CustomerCareMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message): message is CustomerCareMessage =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message?.content === "string",
    );
  } catch {
    return [];
  }
}

function toBookingService(service?: string) {
  const normalized = service?.toLowerCase() ?? "";
  if (normalized.includes("spring")) return "springs";
  if (normalized.includes("opener")) return "opener";
  if (normalized.includes("new garage") || normalized.includes("installation")) return "installation";
  if (normalized.includes("tune") || normalized.includes("maintenance")) return "maintenance";
  return "repair";
}

export function consumeServiceRequestDraft(): Partial<ServiceRequestDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem("garage_service_request_draft");
    if (!saved) return null;
    sessionStorage.removeItem("garage_service_request_draft");
    const draft = JSON.parse(saved) as Partial<ServiceRequestDraft>;
    return typeof draft.details === "string" ? draft : null;
  } catch {
    sessionStorage.removeItem("garage_service_request_draft");
    return null;
  }
}

export function useCustomerCareChat() {
  const [messages, setMessages] = useState<CustomerCareMessage[]>(() => {
    const saved = readSavedMessages();
    return saved.length > 0 ? saved : [{ role: "assistant", content: customerCareWelcome() }];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const typingStartedAtRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const askMutation = useAskGarageAssistant();
  const { data: settings } = useGetPublicBusinessSettings();

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!settings?.businessName) return;
    setMessages((previous) => {
      if (
        previous.length !== 1 ||
        previous[0].role !== "assistant" ||
        !isCustomerCareWelcome(previous[0].content)
      ) {
        return previous;
      }
      const content = customerCareWelcome(settings.businessName);
      return previous[0].content === content ? previous : [{ role: "assistant", content }];
    });
  }, [settings?.businessName]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-24)));
    }
  }, [messages]);

  const queueAssistantMessage = (message: CustomerCareMessage) => {
    const elapsed = typingStartedAtRef.current === null
      ? 0
      : Date.now() - typingStartedAtRef.current;
    const remaining = Math.max(typingDurationFor(message.content) - elapsed, 0);

    typingTimerRef.current = window.setTimeout(() => {
      setMessages((previous) => [...previous, message]);
      setIsTyping(false);
      typingStartedAtRef.current = null;
      typingTimerRef.current = null;
    }, remaining);
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || askMutation.isPending || isVerifying) return;

    const userMessage = input.trim();
    setIsVerifying(true);
    let turnstileToken: string | undefined;
    try {
      turnstileToken = await getInvisibleTurnstileToken("assistant");
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "I couldn’t verify this message right now. Please try again in a moment.",
          safety: "caution",
        },
      ]);
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);
    const history: NonNullable<AssistantInput["history"]> = messages
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    setMessages((previous) => [...previous, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);
    typingStartedAtRef.current = Date.now();

    askMutation.mutate(
      { data: ({ message: userMessage, history, ...(turnstileToken ? { turnstileToken } : {}) } as AssistantInput & { turnstileToken?: string }) as AssistantInput },
      {
        onSuccess: (data) => {
          queueAssistantMessage({
            role: "assistant",
            content: data.reply,
            safety: data.safetyLevel,
            service: data.suggestedService,
            showServiceRequestLink:
              data.serviceRequestRecommended ??
              shouldOfferServiceRequestLink(
                data.reply,
                data.suggestedService,
                data.safetyLevel,
              ),
          });
        },
        onError: () => {
          queueAssistantMessage({
            role: "assistant",
            content:
              "I’m sorry—I couldn’t get that information just now. Start a service request and the business can review what’s going on and help with the next step.",
            safety: "caution",
            service: "Service assessment",
            showServiceRequestLink: true,
          });
        },
      },
    );
  };

  const startServiceRequest = () => {
    if (typeof window === "undefined") return;
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const transcript = messages
      .map((message) => `${message.role === "user" ? "Customer" : "Customer care"}: ${message.content}`)
      .join("\n")
      .slice(-2400);
    const draft: ServiceRequestDraft = {
      service: toBookingService(lastAssistant?.service),
      urgency: messages.some((message) => message.safety === "urgent") ? "emergency" : "flexible",
      details: `Started with customer care.\n\n${transcript}`,
    };
    sessionStorage.setItem("garage_service_request_draft", JSON.stringify(draft));
    window.dispatchEvent(new CustomEvent(SERVICE_REQUEST_DRAFT_EVENT, { detail: draft }));
    navigateToPublicSection("booking");
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    startServiceRequest,
    isPending: askMutation.isPending || isTyping || isVerifying,
    hasUserMessages: messages.some((message) => message.role === "user"),
    businessName: settings?.businessName || "Garage Door Service Preview",
  };
}