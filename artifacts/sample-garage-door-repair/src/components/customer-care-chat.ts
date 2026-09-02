import { useEffect, useState } from "react";
import { useAskGarageAssistant, useGetBusinessSettings } from "@workspace/api-client-react";
import type { AssistantInput, AssistantReply } from "@workspace/api-client-react";

export type CustomerCareMessage = {
  role: "user" | "assistant";
  content: string;
  safety?: AssistantReply["safetyLevel"];
  service?: string;
};

export type ServiceRequestDraft = {
  service: string;
  urgency: "emergency" | "soon" | "flexible";
  details: string;
};

export const CUSTOMER_CARE_NAME = "Maya";

export const customerCareWelcome = (businessName = "Summit Garage Door Co.") =>
  `Hi! I’m Maya from ${businessName}. I can help with services, service area, and next steps—and help you start a service request. What can we help with today?`;

const storageKey = "garage_customer_care_messages";

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
  const askMutation = useAskGarageAssistant();
  const { data: settings } = useGetBusinessSettings();

  useEffect(() => {
    if (!settings?.businessName) return;
    setMessages((previous) => {
      if (
        previous.length !== 1 ||
        previous[0].role !== "assistant" ||
        !previous[0].content.includes("I’m Maya from")
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

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || askMutation.isPending) return;

    const userMessage = input.trim();
    const history: NonNullable<AssistantInput["history"]> = messages
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));
    setMessages((previous) => [...previous, { role: "user", content: userMessage }]);
    setInput("");

    askMutation.mutate(
      { data: { message: userMessage, history } },
      {
        onSuccess: (data) => {
          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              content: data.reply,
              safety: data.safetyLevel,
              service: data.suggestedService,
            },
          ]);
        },
        onError: () => {
          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              content:
                "I’m sorry—I couldn’t get that information just now. You can call our team or start a service request, and we’ll help identify the right next step.",
              safety: "caution",
              service: "Service assessment",
            },
          ]);
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
    window.location.assign(`${import.meta.env.BASE_URL}book`);
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
    startServiceRequest,
    isPending: askMutation.isPending,
    hasUserMessages: messages.some((message) => message.role === "user"),
    businessName: settings?.businessName || "Summit Garage Door Co.",
  };
}