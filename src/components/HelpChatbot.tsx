import { FormEvent, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  MessageCircle,
  SendHorizonal,
  UserRound,
  X,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface QuickPrompt {
  label: string;
  prompt: string;
}

const quickPrompts: QuickPrompt[] = [
  {
    label: "Raise complaint",
    prompt: "How do I raise a complaint?",
  },
  {
    label: "Track ticket",
    prompt: "How do I track my complaint?",
  },
  {
    label: "Voice input",
    prompt: "How do I use voice to text?",
  },
  {
    label: "Login help",
    prompt: "How do login and roles work?",
  },
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "Hi, I am the Sentinel AI help assistant. Ask me how to raise a complaint, track a ticket ID, use voice input, or understand citizen and admin access.",
};

function normalizeMessage(message: string) {
  return message.toLowerCase().replace(/[^\w\s#-]/g, " ");
}

function getAssistantReply(rawMessage: string) {
  const message = normalizeMessage(rawMessage);

  if (
    message.includes("raise") ||
    message.includes("submit") ||
    message.includes("complaint") ||
    message.includes("report") ||
    message.includes("shikayat") ||
    message.includes("samasy")
  ) {
    return [
      "To raise a complaint, open User Dashboard.",
      "Fill Complaint details, select Language, choose Category, enter Location such as Sector 4, then press Submit complaint.",
      "After submission, Sentinel AI shows a ticket ID like SEN-2026-0053. Keep that ticket ID for tracking.",
    ].join("\n");
  }

  if (
    message.includes("track") ||
    message.includes("ticket") ||
    message.includes("status") ||
    message.includes("progress") ||
    message.includes("lookup")
  ) {
    return [
      "To track a complaint, use the Ticket Progress Lookup on the User Dashboard.",
      "Enter your ticket ID exactly as shown, for example SEN-2026-0053.",
      "The tracker will show the complaint moving from Received to Assigned, In Progress, and Fixed or Resolved.",
    ].join("\n");
  }

  if (
    message.includes("voice") ||
    message.includes("mic") ||
    message.includes("microphone") ||
    message.includes("bol") ||
    message.includes("speak") ||
    message.includes("hindi") ||
    message.includes("hinglish")
  ) {
    return [
      "To use voice input, open User Dashboard and choose English, Hindi, or Hinglish in the complaint form.",
      "Press Voice to text, allow microphone permission, and speak clearly.",
      "Your speech will be written into the Complaint details box automatically. Chrome or Edge works best.",
    ].join("\n");
  }

  if (
    message.includes("login") ||
    message.includes("signup") ||
    message.includes("sign up") ||
    message.includes("role") ||
    message.includes("admin") ||
    message.includes("citizen")
  ) {
    return [
      "Open Login / Auth to create an account or sign in.",
      "Citizen/User accounts can raise complaints and track tickets.",
      "Admin accounts can access both User Dashboard and Admin Dashboard. Admin signup requires the invite code admin@access.",
    ].join("\n");
  }

  if (
    message.includes("backend") ||
    message.includes("server") ||
    message.includes("not saved") ||
    message.includes("failed to fetch")
  ) {
    const isLocalApp =
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

    return [
      isLocalApp
        ? "If complaint saving or login fails, make sure the local backend is running."
        : "If complaint saving or login fails, the deployed API or database configuration needs attention.",
      isLocalApp
        ? 'In PowerShell, run: cd "C:\\Users\\LENOVO\\Documents\\New project\\civicflow" then npm run dev:backend.'
        : "Ask an admin to verify the Vercel environment variables, especially MONGODB_URI and JWT secrets.",
      isLocalApp
        ? "You can check the backend at /api/health or your local backend health endpoint."
        : "You can check the deployed API at /api/health.",
    ].join("\n");
  }

  return [
    "I can help with these Sentinel AI tasks:",
    "Raise a complaint from User Dashboard.",
    "Track a ticket from Ticket Progress Lookup on the User Dashboard.",
    "Use Voice to text for English, Hindi, or Hinglish complaints.",
    "Understand login roles and Admin Dashboard access.",
  ].join("\n");
}

function createMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
  };
}

export function HelpChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const latestAssistantTip = useMemo(
    () =>
      messages
        .slice()
        .reverse()
        .find((message) => message.role === "assistant")?.text ?? welcomeMessage.text,
    [messages],
  );

  function askChatbot(prompt: string) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    setMessages((current) => [
      ...current,
      createMessage("user", trimmedPrompt),
      createMessage("assistant", getAssistantReply(trimmedPrompt)),
    ]);
    setInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askChatbot(input);
  }

  function openChatbot() {
    setIsOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 100);
  }

  if (!isOpen) {
    return (
      <button
        className="fixed bottom-5 right-5 z-50 inline-flex min-h-12 items-center gap-3 rounded-xl border border-teal-200 bg-white px-4 text-sm font-black text-ink shadow-premium transition hover:-translate-y-0.5 hover:border-teal-300"
        type="button"
        onClick={openChatbot}
        aria-label="Open Sentinel AI help chatbot"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-teal-600 text-white">
          <MessageCircle size={19} />
        </span>
        <span className="hidden sm:inline">Help chatbot</span>
      </button>
    );
  }

  return (
    <section
      className="fixed bottom-4 right-4 z-50 grid max-h-[78vh] w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-premium"
        aria-label="Sentinel AI help chatbot"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-teal-600 text-white">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="text-sm font-black text-ink">Sentinel AI</h2>
            <p className="text-xs font-semibold text-muted">Complaint and tracking guide</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-ink"
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize help chatbot"
          >
            <ChevronDown size={18} />
          </button>
          <button
            className="grid size-9 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-ink"
            type="button"
            onClick={() => {
              setMessages([welcomeMessage]);
              setInput("");
              setIsOpen(false);
            }}
            aria-label="Close help chatbot"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="max-h-[44vh] overflow-y-auto px-4 py-4">
        <div className="grid gap-3">
          {messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser ? (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <Bot size={15} />
                  </span>
                ) : null}
                <div
                  className={`max-w-[82%] rounded-xl px-3 py-2 ${
                    isUser
                      ? "bg-teal-700 text-white"
                      : "border border-line bg-slate-50 text-ink"
                  }`}
                >
                  {!isUser ? (
                    <span className="mb-1 block text-[11px] font-black uppercase text-teal-700">
                      Sentinel AI
                    </span>
                  ) : null}
                  <p className="whitespace-pre-line text-sm font-semibold leading-6">
                    {message.text}
                  </p>
                </div>
                {isUser ? (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-muted">
                    <UserRound size={15} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-line bg-white px-4 py-3">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.label}
              className="shrink-0 rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs font-black text-muted transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
              type="button"
              onClick={() => askChatbot(prompt.prompt)}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-slate-50 px-3 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask how to use Sentinel AI..."
            aria-label="Ask Sentinel AI help chatbot"
          />
          <button
            className="grid size-11 shrink-0 place-items-center rounded-lg bg-teal-700 text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={!input.trim()}
            aria-label="Send chatbot message"
          >
            <SendHorizonal size={18} />
          </button>
        </form>

        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-muted">
          Tip: {latestAssistantTip.split("\n")[0]}
        </p>
      </div>
    </section>
  );
}
