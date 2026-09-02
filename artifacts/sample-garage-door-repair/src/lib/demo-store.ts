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
    title: "Modern Wood-Look Upgrade",
    description: "The same garage transformed from a weathered white panel door to a warm contemporary wood-look design.",
    beforeImageUrl: "/images/garage/before-after/modern-wood-before.jpg",
    afterImageUrl: "/images/garage/before-after/modern-wood-after.jpg"
  },
  {
    id: "2",
    title: "Carriage-House Door Refresh",
    description: "The same two-bay garage updated from dated red doors to bright carriage-house doors with decorative hardware.",
    beforeImageUrl: "/images/garage/before-after/carriage-house-before.jpg",
    afterImageUrl: "/images/garage/before-after/carriage-house-after.jpg"
  },
  {
    id: "3",
    title: "Traditional Curb Appeal Upgrade",
    description: "A plain white garage door gains windows and carriage-style hardware while preserving the home's classic exterior.",
    beforeImageUrl: "/images/garage/before-after/project-02-before.jpg",
    afterImageUrl: "/images/garage/before-after/project-02-after.jpg"
  },
  {
    id: "4",
    title: "Contemporary Woodland Refresh",
    description: "The same wooded property receives a dark modern garage door that complements its natural surroundings.",
    beforeImageUrl: "/images/garage/before-after/project-04-before.jpg",
    afterImageUrl: "/images/garage/before-after/project-04-after.jpg"
  },
  {
    id: "5",
    title: "Three-Bay Exterior Transformation",
    description: "A full exterior renovation pairs new garage doors with windows for a brighter, more coordinated façade.",
    beforeImageUrl: "/images/garage/before-after/project-05-before.jpg",
    afterImageUrl: "/images/garage/before-after/project-05-after.jpg"
  },
  {
    id: "6",
    title: "Warm Carriage-Style Update",
    description: "The same stucco home is refreshed with a warm-toned carriage-style door and decorative upper windows.",
    beforeImageUrl: "/images/garage/before-after/project-06-before.jpg",
    afterImageUrl: "/images/garage/before-after/project-06-after.jpg"
  }
];

const mismatchedDefaultTasks: Task[] = [
  {
    id: "1",
    title: "Classic to Contemporary",
    description: "A representative upgrade from a basic white door to a clean, modern glass-panel design.",
    beforeImageUrl: "/images/garage/classic-white-door.jpg",
    afterImageUrl: "/images/garage/modern-white-home.jpg",
  },
  {
    id: "2",
    title: "Curb Appeal Refresh",
    description: "A representative transformation from an aging single-bay door to a coordinated two-door exterior.",
    beforeImageUrl: "/images/garage/before-after/brick-brown-door.jpg",
    afterImageUrl: "/images/garage/before-after/double-door-planters.jpg",
  },
  {
    id: "3",
    title: "Modern Black Door Upgrade",
    description: "A representative style upgrade showing how a dark insulated door can sharpen a home's exterior.",
    beforeImageUrl: "/images/garage/evening-home.jpg",
    afterImageUrl: "/images/garage/before-after/modern-dark-door.jpg",
  },
];

const previousDefaultTasks: Task[] = [
  {
    id: "1",
    title: "Damaged Door Transformation",
    description: "Replaced a worn residential door with a quiet, insulated modern system.",
    beforeImageUrl: "/images/garage/classic-white-door.jpg",
    afterImageUrl: "/images/garage/modern-white-home.jpg",
  },
  {
    id: "2",
    title: "Premium Curb Appeal Upgrade",
    description: "Upgraded the original entry to a warm contemporary door matched to the home.",
    beforeImageUrl: "/images/garage/evening-home.jpg",
    afterImageUrl: "/images/garage/double-garage-home.jpg",
  },
];

const legacyDefaultTask: Task = {
  id: "1",
  title: "Broken Spring Replacement",
  description: "Replaced a snapped torsion spring with a heavy-duty cycle spring.",
  beforeImageUrl: "https://images.unsplash.com/photo-1622473590773-f58813470716?w=800&q=80",
  afterImageUrl: "https://images.unsplash.com/photo-1622473590773-f58813470716?w=800&q=80",
};

const isSameTask = (task: Task, seed: Task) =>
  task.id === seed.id &&
  task.title === seed.title &&
  task.description === seed.description &&
  task.beforeImageUrl === seed.beforeImageUrl &&
  task.afterImageUrl === seed.afterImageUrl;

export function useListTasks() {
  return useQuery({
    queryKey: ["demo-tasks"],
    queryFn: () => {
      const tasks = getStorage<Task[]>("tasks", defaultTasks);
      let didUpgrade = false;
      const upgraded = tasks.flatMap((task) => {
        if (isSameTask(task, legacyDefaultTask)) {
          didUpgrade = true;
          return [defaultTasks[0]];
        }
        const previousDefaultIndex = previousDefaultTasks.findIndex((previous) => isSameTask(task, previous));
        if (previousDefaultIndex !== -1) {
          didUpgrade = true;
          return [defaultTasks[previousDefaultIndex]];
        }
        const mismatchedDefaultIndex = mismatchedDefaultTasks.findIndex((previous) => isSameTask(task, previous));
        if (mismatchedDefaultIndex !== -1) {
          didUpgrade = true;
          return mismatchedDefaultIndex < defaultTasks.length ? [defaultTasks[mismatchedDefaultIndex]] : [];
        }
        return [task];
      });
      if (getStorage<number>("tasks-seed-version", 0) < 3) {
        const retainedOriginalPairs = defaultTasks
          .slice(0, 2)
          .every((seed) => upgraded.some((task) => isSameTask(task, seed)));
        if (retainedOriginalPairs) {
          for (const seed of defaultTasks.slice(2)) {
            if (!upgraded.some((task) => task.id === seed.id)) {
              upgraded.push(seed);
              didUpgrade = true;
            }
          }
        }
        setStorage("tasks-seed-version", 3);
      }
      if (didUpgrade) {
        setStorage("tasks", upgraded);
      }
      return upgraded;
    },
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
