import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const isBrowser = typeof window !== "undefined";

function getStorage<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  const val = localStorage.getItem(`demo_${key}`);
  return val ? JSON.parse(val) : defaultValue;
}

function setStorage<T>(key: string, value: T) {
  if (isBrowser) {
    localStorage.setItem(`demo_${key}`, JSON.stringify(value));
  }
}

// === FAQs ===
export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const defaultFaqs: FAQ[] = [
  { id: "1", question: "What's your service area?", answer: "I serve the greater metro area and surrounding communities. If you're within 20 miles, I can help." },
  { id: "2", question: "How quickly can you respond?", answer: "I respond to requests in 45 minutes on average. Most messages get answered within an hour." },
  { id: "3", question: "Do you offer free estimates?", answer: "Yes! For larger projects I provide free, detailed estimates. Smaller jobs are typically quoted after a quick phone discussion." },
];

export function useListFaqs() {
  return useQuery({
    queryKey: ["demo-faqs"],
    queryFn: () => getStorage<FAQ[]>("faqs", defaultFaqs),
  });
}

export function useSaveFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (faq: Partial<FAQ> & { question: string; answer: string }) => {
      const faqs = getStorage<FAQ[]>("faqs", defaultFaqs);
      if (faq.id) {
        const idx = faqs.findIndex(f => f.id === faq.id);
        if (idx !== -1) faqs[idx] = { ...faqs[idx], ...faq } as FAQ;
      } else {
        faqs.push({ ...faq, id: Date.now().toString() } as FAQ);
      }
      setStorage("faqs", faqs);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-faqs"] }),
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const faqs = getStorage<FAQ[]>("faqs", defaultFaqs).filter(f => f.id !== id);
      setStorage("faqs", faqs);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-faqs"] }),
  });
}

// === Before & After Tasks ===
export interface Task {
  id: string;
  title: string;
  description: string;
  beforeImageUrl: string;
  afterImageUrl: string;
}

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Broken Spring Replacement",
    description: "Replaced a snapped torsion spring with a heavy-duty cycle spring.",
    beforeImageUrl: "https://images.unsplash.com/photo-1622473590773-f58813470716?w=800&q=80",
    afterImageUrl: "https://images.unsplash.com/photo-1622473590773-f58813470716?w=800&q=80"
  }
];

export function useListTasks() {
  return useQuery({
    queryKey: ["demo-tasks"],
    queryFn: () => getStorage<Task[]>("tasks", defaultTasks),
  });
}

export function useSaveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<Task> & { title: string; beforeImageUrl: string; afterImageUrl: string }) => {
      const tasks = getStorage<Task[]>("tasks", defaultTasks);
      if (task.id) {
        const idx = tasks.findIndex(t => t.id === task.id);
        if (idx !== -1) tasks[idx] = { ...tasks[idx], ...task } as Task;
      } else {
        tasks.push({ ...task, id: Date.now().toString(), description: task.description || "" } as Task);
      }
      setStorage("tasks", tasks);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-tasks"] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const tasks = getStorage<Task[]>("tasks", defaultTasks).filter(t => t.id !== id);
      setStorage("tasks", tasks);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-tasks"] }),
  });
}

// === Chat Inquiries ===
export interface ChatInquiry {
  id: string;
  customerName: string;
  phone: string;
  message: string;
  status: "new" | "replied" | "archived";
  createdAt: string;
}

export function useListChatInquiries() {
  return useQuery({
    queryKey: ["demo-chats"],
    queryFn: () => getStorage<ChatInquiry[]>("chats", []),
  });
}

export function useSaveChatInquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chat: Partial<ChatInquiry> & { customerName: string; phone: string; message: string }) => {
      const chats = getStorage<ChatInquiry[]>("chats", []);
      if (chat.id) {
        const idx = chats.findIndex(c => c.id === chat.id);
        if (idx !== -1) chats[idx] = { ...chats[idx], ...chat } as ChatInquiry;
      } else {
        chats.unshift({ ...chat, id: Date.now().toString(), status: "new", createdAt: new Date().toISOString() } as ChatInquiry);
      }
      setStorage("chats", chats);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-chats"] }),
  });
}

// === Bookings (Mocked Calendar) ===
export interface Booking {
  id: string;
  title: string;
  date: string;
  customer: string;
}

export function useListBookings() {
  return useQuery({
    queryKey: ["demo-bookings"],
    queryFn: () => getStorage<Booking[]>("bookings", []),
  });
}
