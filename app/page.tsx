"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./styles/page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hallo, ich bin dein vertraulicher NGO-Chat. Wobei kann ich dich unterstützen?",
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bubblesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bubblesRef.current?.scrollTo({ top: bubblesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler bei der Anfrage");
      }

      const [data] = await Promise.all([res.json(), wait(800)]); // min. Tippdauer
      const reply = data.reply || "Entschuldige, ich habe gerade keine Antwort.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <main>
      <section className="chat-shell" aria-label="NGO Beratungs-Chat">
        <header className="header">
          <div className="title-block">
            <h1 className="title">NGO Support Chat</h1>
            <p className="subtitle">Vertraulich, niedrigschwellig, ohne Klarnamen. Wir helfen dir, den nächsten Schritt zu finden.</p>
          </div>
          <div className="badges" aria-hidden>
            <span className="badge online-dot">Online</span>
            <span className="badge">Antidiskriminierung</span>
            <span className="badge">Psycho-soziale Hilfe</span>
          </div>
        </header>

        <div className="banner" role="note" aria-live="polite">
          <strong>Wichtig:</strong> Bei akuter Gefahr bitte sofort den lokalen Notruf (112) oder Hilfetelefon
          (z.B. 08000 116 016) kontaktieren.
        </div>

        <div className="chat-area">
          <div className="bubbles" ref={bubblesRef} aria-live="polite">
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble ${m.role === "user" ? "user" : "bot"}`}>
                <strong>{m.role === "user" ? "Du" : "Beratung"}:</strong> {m.content}
              </div>
            ))}
            {loading && (
              <div className="bubble bot typing" aria-live="polite">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
          </div>

          <form className="form-card" onSubmit={handleSubmit} aria-label="Nachricht senden">
            <div>
              <label htmlFor="message">Worum geht es? (keine Klarnamen nötig)</label>
              <textarea
                id="message"
                name="message"
                placeholder="Beschreibe kurz dein Anliegen."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                required
              />
            </div>
            <div className="actions">
              <button className="primary" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? "Antwort wird verfasst..." : "Senden"}
              </button>
              <div className="status" role="status" aria-live="polite">
                {error ? `Fehler: ${error}` : loading ? "Bot denkt nach..." : "Bereit."}
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
