"use client";

import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import styles from "./styles/page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "QueerHafen Chat";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Schön, dass du da bist 💜\nIch bin Alex, virtuelle*r Mitarbeiter*in bei QueerHafen. Ich kann dir erste Orientierung geben, dir ein passendes Angebot vorschlagen oder einfach da sein, wenn du reden möchtest.\n\nWie darf ich dich nennen?\n(Wenn du möchtest, nimm gern einen anderen Namen.)\n\n[Buttons]:\n- Ich brauche einfach jemanden zum Reden\n- Stress in Beziehung oder Freundschaften\n- Schlechte Stimmung / Überforderung\n- Diskriminierung oder Gewalt erlebt\n- Probleme mit Geld, Amt, Jobcenter\n- Wohn- oder Alltagssorgen\n- Fragen zu Identität / Coming-out\n- Sind meine Daten sicher?\n- Etwas anderes",
      ts: Date.now(),
    },
  ]);
  const prevLenRef = useRef(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simpleLanguage, setSimpleLanguage] = useState(false);
  const [language, setLanguage] = useState<"Deutsch" | "English" | "Türkçe" | "Español">("Deutsch");
  const [lastReadUserIndex, setLastReadUserIndex] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [padNotes, setPadNotes] = useState({
    good: "",
    challenges: "",
    ideas: "",
    safety: "",
    questions: "",
  });
  const bubblesRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const [captureLoading, setCaptureLoading] = useState(false);

  useEffect(() => {
    bubblesRef.current?.scrollTo({ top: bubblesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const playTone = useCallback(() => {
    if (!soundOn) return;
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
  }, [soundOn]);

  useEffect(() => {
    const prev = prevLenRef.current;
    if (messages.length > prev) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        playTone();
      }
    }
    prevLenRef.current = messages.length;
  }, [messages, playTone]);

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

    const userMsg: Message = { role: "user", content: `${text}${metaNote}`, ts: Date.now() };
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
      setMessages((prev) => {
        const next = [...prev, { role: "assistant", content: reply, ts: Date.now() }];
        const lastUserIndex = [...next].reverse().findIndex((m) => m.role === "user");
        if (lastUserIndex !== -1) {
          setLastReadUserIndex(next.length - 1 - lastUserIndex);
        }
        return next;
      });
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

  const handleCapture = async () => {
    if (!padRef.current || captureLoading) return;
    setCaptureLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(padRef.current, { backgroundColor: "#eef2ff", scale: 2 });
      const data = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = data;
      link.download = "queerhafen-workshop-notes.png";
      link.click();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Capture failed", err);
      setError("Screenshot konnte nicht erstellt werden.");
    } finally {
      setCaptureLoading(false);
    }
  };

  const buildNotesText = () => {
    return [
      "Workshop-Notizen (QueerHafen)",
      "",
      "1) Was lief gut?",
      padNotes.good || "-",
      "",
      "2) Herausforderungen?",
      padNotes.challenges || "-",
      "",
      "3) Ideen fürs Angebot?",
      padNotes.ideas || "-",
      "",
      "4) Safety & Barrierearmut",
      padNotes.safety || "-",
      "",
      "5) Offene Fragen",
      padNotes.questions || "-",
    ].join("\n");
  };

  const handleCopyNotes = async () => {
    try {
      await navigator.clipboard.writeText(buildNotesText());
      setError(null);
    } catch {
      setError("Kopieren nicht möglich.");
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([buildNotesText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "queerhafen-workshop-notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePadEnter = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: keyof typeof padNotes
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      setPadNotes((p) => {
        const current = p[field] || "";
        const next = current.length === 0 ? "- " : `${current}\n- `;
        return { ...p, [field]: next };
      });
    }
  };

  return (
    <main>
      <section className="chat-shell" aria-label="NGO Beratungs-Chat">
        <div className="chat-header" aria-label="Chatbot">
          <div className="chat-icon" aria-hidden />
          <div>
            <div className="chat-title">QueerHafen</div>
            <div className="chat-sub">Komm, sprich mit uns – wir hören zu.</div>
          </div>
        </div>

        <div className="safety-note" role="note" aria-live="polite">
          Bei akuter Gefahr bitte sofort den lokalen Notruf (112) oder Hilfetelefon (z.B. 08000 116 016) kontaktieren.
        </div>

        <div className="chat-area">
          <div className="bubbles" ref={bubblesRef} aria-live="polite">
            {messages.map((m, idx) => (
              <div key={idx} className={`bubble-row ${m.role === "user" ? "user" : "bot"}`}>
                {m.role === "assistant" && <div className="avatar online" aria-hidden>Alex</div>}
                <div className={`bubble ${m.role === "user" ? "user" : "bot"} animate-in`}>
                  {(() => {
                    const { main, options } = extractButtons(m.content);
                    const formattedTime =
                      hydrated && m.ts
                        ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(m.ts)
                        : "";
                    return (
                      <>
                        {main.split("\n").map((line, i) => (
                          <span key={i} style={{ display: "block", marginTop: i === 0 ? 0 : 4 }}>
                            {line}
                          </span>
                        ))}
                        {formattedTime ? (
                          <div className="meta-row">
                            <span className="timestamp">{formattedTime}</span>
                            {m.role === "user" && lastReadUserIndex !== null && idx <= lastReadUserIndex && (
                              <span className="read-receipt" aria-label="gelesen">✓✓</span>
                            )}
                          </div>
                        ) : null}
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
                {error ? `Fehler: ${error}` : ""}
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

      <section className="workshop-pad" aria-label="Workshop Notizpad" ref={padRef}>
        <h2>Workshop-Notizen</h2>
        <p className="pad-hint">Kurze Stichpunkte zu den Fragen festhalten. Optional als Screenshot sichern.</p>
        <div className="pad-grid">
          <div className="pad-card">
            <h3>1) Was lief gut?</h3>
            <textarea
              placeholder="Stichpunkte..."
              value={padNotes.good}
              onChange={(e) => setPadNotes((p) => ({ ...p, good: e.target.value }))}
              onKeyDown={(e) => handlePadEnter(e, "good")}
            />
          </div>
          <div className="pad-card">
            <h3>2) Herausforderungen?</h3>
            <textarea
              placeholder="Stichpunkte..."
              value={padNotes.challenges}
              onChange={(e) => setPadNotes((p) => ({ ...p, challenges: e.target.value }))}
              onKeyDown={(e) => handlePadEnter(e, "challenges")}
            />
          </div>
          <div className="pad-card">
            <h3>3) Ideen fürs Angebot?</h3>
            <textarea
              placeholder="Stichpunkte..."
              value={padNotes.ideas}
              onChange={(e) => setPadNotes((p) => ({ ...p, ideas: e.target.value }))}
              onKeyDown={(e) => handlePadEnter(e, "ideas")}
            />
          </div>
          <div className="pad-card">
            <h3>4) Safety & Barrierearmut</h3>
            <textarea
              placeholder="Stichpunkte..."
              value={padNotes.safety}
              onChange={(e) => setPadNotes((p) => ({ ...p, safety: e.target.value }))}
              onKeyDown={(e) => handlePadEnter(e, "safety")}
            />
          </div>
          <div className="pad-card">
            <h3>5) Offene Fragen</h3>
            <textarea
              placeholder="Stichpunkte..."
              value={padNotes.questions}
              onChange={(e) => setPadNotes((p) => ({ ...p, questions: e.target.value }))}
              onKeyDown={(e) => handlePadEnter(e, "questions")}
            />
          </div>
        </div>
        <div className="pad-actions">
          <button className="secondary" type="button" onClick={handleCopyNotes}>
            In Zwischenablage kopieren
          </button>
          <button className="secondary" type="button" onClick={handleDownloadTxt}>
            Als TXT speichern
          </button>
          <button className="primary" type="button" onClick={handleCapture} disabled={captureLoading}>
            {captureLoading ? "Erstelle Screenshot..." : "Screenshot speichern"}
          </button>
        </div>
      </section>
    </main>
  );
}
