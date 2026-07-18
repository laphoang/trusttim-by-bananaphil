"use client";

import { useEffect, useRef, useState } from "react";
import { BOOKING_CONTACT, BOOKING_FACILITIES } from "@/lib/booking/mock-data";
import { BOOKING_CTA_LABEL } from "@/lib/scope/responses";

type ResponseType =
  | "emergency"
  | "normal_symptom_redirect"
  | "classifier_failsafe"
  | "out_of_scope"
  | "grounding_gate"
  | "grounded_answer"
  | "booking_only";

interface Citation {
  title: string | null;
  sourceUrl: string | null;
  isSynthetic: boolean;
  freshness: string | null;
}

interface ChatApiResult {
  responseType: ResponseType;
  message: string;
  citations: Citation[];
  bookingCta: boolean;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  responseType?: ResponseType;
  citations?: Citation[];
  bookingCta?: boolean;
  animate?: boolean;
}

const STYLE_BY_TYPE: Record<ResponseType, string> = {
  emergency: "border-red-600 bg-red-50 text-red-900",
  normal_symptom_redirect: "border-amber-500 bg-amber-50 text-amber-900",
  classifier_failsafe: "border-amber-500 bg-amber-50 text-amber-900",
  out_of_scope: "border-slate-300 bg-slate-50 text-slate-700",
  grounding_gate: "border-sky-300 bg-sky-50 text-sky-900",
  grounded_answer: "border-slate-200 bg-white text-slate-800",
  booking_only: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

function Typewriter({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? "" : text);

  useEffect(() => {
    if (!animate) {
      setShown(text);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 12);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <p className="whitespace-pre-wrap leading-relaxed">{shown}</p>;
}

function BookingPanel() {
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-current/10 pt-3 text-sm">
      {BOOKING_FACILITIES.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="opacity-80">
            {f.label}: {f.address}
          </span>
          <a
            href={f.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand/90"
          >
            {BOOKING_CTA_LABEL}
          </a>
        </div>
      ))}
      <span>
        Tổng đài:{" "}
        <a href={`tel:${BOOKING_CONTACT.hotline}`} className="underline">
          {BOOKING_CONTACT.hotline}
        </a>
      </span>
    </div>
  );
}

function CitationChips({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">
      {citations.map((c, i) => (
        <span
          key={i}
          title={c.freshness ?? undefined}
          className="rounded-full border border-current/20 bg-white/60 px-2 py-0.5 text-xs"
        >
          {c.sourceUrl ? (
            <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {c.title ?? c.sourceUrl}
            </a>
          ) : (
            c.title ?? "nguồn"
          )}
          {c.isSynthetic && " · minh hoạ"}
        </span>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Xin chào! Tôi là TrustTim, trợ lý thông tin của Bệnh viện Tim Hà Nội. " +
        "Tôi có thể hỗ trợ thông tin về đặt lịch khám, bảo hiểm y tế, quy trình khám chữa bệnh, " +
        "thông tin bệnh viện, và lịch khám bác sĩ. Bạn cần hỗ trợ gì?",
      responseType: "grounded_answer",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data: ChatApiResult = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.message,
          responseType: data.responseType,
          citations: data.citations,
          bookingCta: data.bookingCta,
          animate: true,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Xin lỗi, đã có lỗi kết nối. Vui lòng thử lại hoặc gọi tổng đài 1900 1082 để được hỗ trợ.",
          responseType: "classifier_failsafe",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-4">
      <header className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
          T
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">TrustTim</h1>
          <p className="text-xs text-slate-500">Trợ lý AI · Bệnh viện Tim Hà Nội</p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-brand px-4 py-2 text-sm text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm ${
                  STYLE_BY_TYPE[m.responseType ?? "grounded_answer"]
                }`}
              >
                {m.responseType === "emergency" && (
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide">
                    ⚠ Cảnh báo cấp cứu
                  </p>
                )}
                <Typewriter text={m.text} animate={!!m.animate} />
                {m.responseType === "emergency" && (
                  <a
                    href="tel:115"
                    className="mt-2 inline-block rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    Gọi 115 ngay
                  </a>
                )}
                {m.citations && <CitationChips citations={m.citations} />}
                {m.bookingCta && <BookingPanel />}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-slate-200 pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Nhập câu hỏi của bạn..."
          className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          onClick={send}
          disabled={sending}
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-60"
        >
          Gửi
        </button>
      </div>
    </main>
  );
}
