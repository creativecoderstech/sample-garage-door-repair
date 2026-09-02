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
  { id: "1", question: "What areas do you serve?", answer: "We serve Dallas–Fort Worth and nearby communities. Send us your ZIP code or call us, and we’ll quickly confirm whether your address is inside our service area." },
  { id: "2", question: "How quickly can you respond?", answer: "We answer most requests within 45 minutes during business hours and offer priority scheduling for doors that are stuck open, off track, or creating a security concern." },
  { id: "3", question: "Do you provide estimates before starting work?", answer: "Yes. A technician will inspect the system, explain what failed, and give you clear repair options before work begins. We do not add work without your approval." },
  { id: "4", question: "Why won’t my garage door open?", answer: "Common causes include a broken spring, disconnected or failed opener, blocked safety sensor, damaged cable, power issue, or a door that has come off track. Stop pressing the opener if the door strains, lifts unevenly, or makes a sharp popping sound, and schedule an inspection." },
  { id: "5", question: "How can I tell if a garage door spring is broken?", answer: "You may hear a loud bang, see a visible gap in the spring, notice the door feels extremely heavy, or find that the opener only lifts it a few inches. Springs are under extreme tension—do not touch, unwind, or replace them yourself." },
  { id: "6", question: "Can I manually open the door if the opener is not working?", answer: "Only if the door is fully closed, level, and you have no reason to suspect a broken spring or cable. If the door is unusually heavy, crooked, jammed, or partially open, leave it in place and call a technician. Never pull the emergency release while standing under an unstable door." },
  { id: "7", question: "Why does my garage door close and then reverse?", answer: "The safety sensors may be blocked, dirty, misaligned, or affected by wiring or sunlight. The opener’s travel or force settings may also need professional adjustment. Clear obvious objects from the opening, but do not bypass the sensors—they are an essential safety feature." },
  { id: "8", question: "Why is my garage door suddenly so loud?", answer: "Grinding, squealing, rattling, or popping can come from worn rollers, loose hardware, dry hinges, an opener problem, or a spring or cable issue. A new sound is worth checking early because a small worn part can place extra stress on the rest of the system." },
  { id: "9", question: "What should I do if the garage door is off track or hanging unevenly?", answer: "Stop using the door and keep people, pets, and vehicles away from it. Do not pull cables, loosen brackets, or try to force the rollers back into place. An off-track door can fall unexpectedly and should be stabilized by a trained technician." },
  { id: "10", question: "Why does the wall button work but the remote does not?", answer: "The remote may need a fresh battery, reprogramming, or replacement. Also check whether the opener’s lock or vacation mode is enabled. If several remotes fail at once, the opener’s receiver, antenna, or power supply may need service." },
  { id: "11", question: "Should I repair my garage door or replace it?", answer: "Repair usually makes sense when the panels and track are in good condition and the issue is limited to a replaceable part. Replacement may be the better value when the door has extensive panel damage, recurring failures, poor insulation, serious corrosion, or outdated safety performance. We’ll show you both options when appropriate." },
  { id: "12", question: "How long do garage doors and openers usually last?", answer: "A well-maintained garage door can often serve for 15 to 30 years, while many openers last around 10 to 15 years. Usage, weather, installation quality, door weight, and maintenance all affect lifespan." },
  { id: "13", question: "How often should my garage door be serviced?", answer: "For most homes, a professional inspection once a year is a good preventive schedule. High-use doors may need attention more often. Between visits, watch for frayed cables, loose parts, uneven movement, new noises, and changes in the door’s balance—without touching high-tension components." },
  { id: "14", question: "How much will a garage door repair cost?", answer: "Cost depends on the failed part, door size and weight, parts availability, and whether related damage is present. We provide a clear price after diagnosis and before repairs begin, so you can make an informed decision." },
  { id: "15", question: "Do you offer emergency garage door service?", answer: "Yes, priority help is available for doors that are stuck open, dangerously off track, hanging by a cable, or preventing a vehicle from getting out. If the door looks unstable, keep the area clear and do not attempt to move it." },
];

const previousDefaultFaqs: FAQ[] = [
  { id: "1", question: "What's your service area?", answer: "I serve the greater metro area and surrounding communities. If you're within 20 miles, I can help." },
  { id: "2", question: "How quickly can you respond?", answer: "I respond to requests in 45 minutes on average. Most messages get answered within an hour." },
  { id: "3", question: "Do you offer free estimates?", answer: "Yes! For larger projects I provide free, detailed estimates. Smaller jobs are typically quoted after a quick phone discussion." },
];

export function useListFaqs() {
  return useQuery({
    queryKey: ["demo-faqs"],
    queryFn: () => {
      const faqs = getStorage<FAQ[]>("faqs", defaultFaqs);
      if (getStorage<number>("faqs-seed-version", 0) >= 2) return faqs;

      let didUpgrade = false;
      const upgraded = faqs.map((faq) => {
        const previousIndex = previousDefaultFaqs.findIndex(
          (previous) =>
            faq.id === previous.id &&
            faq.question === previous.question &&
            faq.answer === previous.answer,
        );
        if (previousIndex === -1) return faq;
        didUpgrade = true;
        return defaultFaqs[previousIndex];
      });

      for (const seed of defaultFaqs.slice(3)) {
        if (!upgraded.some((faq) => faq.id === seed.id)) {
          upgraded.push(seed);
          didUpgrade = true;
        }
      }

      setStorage("faqs-seed-version", 2);
      if (didUpgrade) setStorage("faqs", upgraded);
      return upgraded;
    },
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
