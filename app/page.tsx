"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./styles/page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "QueerHafen Chat";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Schön, dass du da bist 💜\nIch bin Alex, virtuelle*r Mitarbeiter*in bei QueerHafen. Ich kann dir erste Orientierung geben, dir ein passendes Angebot vorschlagen oder einfach da sein, wenn du reden möchtest.\n\nWie darf ich dich nennen?\n(Wenn du möchtest, nimm gern einen anderen Namen.)\n\n[Buttons]:\n- Ich brauche einfach jemanden zum Reden\n- Stress in Beziehung oder Freundschaften\n- Schlechte Stimmung / Überforderung\n- Diskriminierung oder Gewalt erlebt\n- Probleme mit Geld, Amt, Jobcenter\n- Wohn- oder Alltagssorgen\n- Fragen zu Identität / Coming-out\n- Sind meine Daten sicher?\n- Etwas anderes",
    },
  ]);
  const prevLenRef = useRef(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simpleLanguage, setSimpleLanguage] = useState(false);
  const [language, setLanguage] = useState<"Deutsch" | "English" | "Türkçe" | "Español">("Deutsch");
  const bubblesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bubblesRef.current?.scrollTo({ top: bubblesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const playTone = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // ignore sound errors (e.g. autoplay blocked)
    }
  };

  useEffect(() => {
    const prev = prevLenRef.current;
    if (messages.length > prev) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        playTone();
      }
    }
    prevLenRef.current = messages.length;
  }, [messages]);

  const extractButtons = (text: string) => {
    const match = text.match(/\[Buttons\]:([\s\S]*)/i);
    if (!match) return { main: text.trim(), options: [] as string[] };
    const options = match[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    const main = text.replace(match[0], "").trim();
    return { main, options };
  };

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const metaNote =
      language !== "Deutsch" || simpleLanguage
        ? ` (Hinweis: Bitte antworte ${language !== "Deutsch" ? "auf " + language : "auf Deutsch"}${simpleLanguage ? " in einfacher Sprache" : ""}.)`
        : "";

    const userMsg: Message = { role: "user", content: `${text}${metaNote}` };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history,
        }),
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
        <div className="safety-note" role="note" aria-live="polite">
          Bei akuter Gefahr bitte sofort den lokalen Notruf (112) oder Hilfetelefon (z.B. 08000 116 016) kontaktieren.
        </div>

        <div className="chat-area">
          <div className="bubbles" ref={bubblesRef} aria-live="polite">
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble-row ${m.role === "user" ? "user" : "bot"}`}>
                {m.role === "assistant" && <div className="avatar online" aria-hidden>Alex</div>}
                <div className={`bubble ${m.role === "user" ? "user" : "bot"}`}>
                  {(() => {
                    const { main, options } = extractButtons(m.content);
                    return (
                      <>
                        {main.split("\n").map((line, i) => (
                          <span key={i} style={{ display: "block", marginTop: i === 0 ? 0 : 4 }}>
                            {line}
                          </span>
                        ))}
                        {m.role === "assistant" && options.length > 0 && (
                          <div className="option-buttons" aria-label="Antwortoptionen">
                            {options.map((opt, i) => (
                              <button
                                key={i}
                                type="button"
                                className="option-btn"
                                disabled={loading}
                                onClick={() => handleSend(opt)}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
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
              <label htmlFor="message" className="sr-only">Nachricht</label>
              <textarea
                id="message"
                name="message"
                placeholder="Tippe einfach drauf los..."
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
                {error ? `Fehler: ${error}` : loading ? "Bot denkt nach..." : ""}
              </div>
            </div>
          </form>
          <div className="footer-toggles">
            <div className="toggle-group" aria-label="Sprache wählen">
              {["Deutsch", "English", "Türkçe", "Español"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`pill ${language === lang ? "active" : ""}`}
                  onClick={() => setLanguage(lang as typeof language)}
                >
                  {lang}
                </button>
              ))}
            </div>
            <div className="toggle-group" aria-label="Einfache Sprache">
              <button
                type="button"
                className={`pill ${simpleLanguage ? "active" : ""}`}
                onClick={() => setSimpleLanguage((v) => !v)}
              >
                {simpleLanguage ? "Einfache Sprache an" : "Einfache Sprache"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
