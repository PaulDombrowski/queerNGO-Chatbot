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
  const initialAssistantMessage =
    "Schön, dass du da bist 💜\nIch bin Alex, virtuelle*r Mitarbeiter*in bei QueerHafen. Ich kann dir erste Orientierung geben, dir ein passendes Angebot vorschlagen oder einfach da sein, wenn du reden möchtest.\n\nWie darf ich dich nennen?\n(Wenn du möchtest, nimm gern einen anderen Namen.)\n\n[Buttons]:\n- Ich brauche einfach jemanden zum Reden\n- Stress in Beziehung oder Freundschaften\n- Schlechte Stimmung / Überforderung\n- Diskriminierung oder Gewalt erlebt\n- Probleme mit Geld, Amt, Jobcenter\n- Wohn- oder Alltagssorgen\n- Fragen zu Identität / Coming-out\n- Sind meine Daten sicher?\n- Etwas anderes";
  const getInitialMessages = (): Message[] => [
    {
      role: "assistant",
      content: initialAssistantMessage,
      ts: Date.now(),
    },
  ];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
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
const CHAT_STORAGE_KEY = "qh-chat-messages";
const PAD_STORAGE_KEY = "qh-pad-notes";
const hasLoadedRef = useRef(false);

  useEffect(() => {
    bubblesRef.current?.scrollTo({ top: bubblesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setHydrated(true);
    // Load stored state once on mount
    if (!hasLoadedRef.current) {
      try {
        const storedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages) as Message[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
        const storedPad = localStorage.getItem(PAD_STORAGE_KEY);
        if (storedPad) {
          const parsedPad = JSON.parse(storedPad);
          setPadNotes((p) => ({ ...p, ...parsedPad }));
        }
      } catch {
        // ignore storage errors
      }
      hasLoadedRef.current = true;
    }
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

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PAD_STORAGE_KEY, JSON.stringify(padNotes));
    } catch {
      // ignore
    }
  }, [padNotes, hydrated]);

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
      setMessages((prev: Message[]) => {
        const next: Message[] = [...prev, { role: "assistant", content: reply, ts: Date.now() }];
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

  const handleClearChat = () => {
    const fresh = getInitialMessages();
    setMessages(fresh);
    setLastReadUserIndex(null);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
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
              <button type="button" className="ghost-btn" onClick={handleClearChat} disabled={loading}>
                Chat zurücksetzen
              </button>
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
        <h2>Workshop-Aufgaben</h2>
        <p className="pad-hint">Mögliche Fragen für den Workshop – du kannst deine Notizen festhalten und als TXT oder Screenshot sichern.</p>
        <div className="pad-intro">
          <p className="pad-text">
            Der soziale Träger QueerHafen überlegt, auf der Website einen Chatbot zu integrieren. Dieser soll:
          </p>
          <ul className="pad-list">
            <li>ein niedrigschwelliger Erstkontakt für ratsuchende Personen sein</li>
            <li>erste Entlastung und Orientierung bieten</li>
            <li>Ratsuchende gezielt zu den passenden Angeboten lenken</li>
          </ul>
          <p className="pad-text">Der Chatbot ersetzt keine Beratung, sondern unterstützt den Einstieg.</p>
        </div>
        <div className="accordion">
          <details>
            <summary>Teil 1: Perspektivwechsel</summary>
            <p className="pad-text">Legt eure Rolle als Berater*in ab. Versetzt euch in eine ratsuchende Person.</p>
            <ul className="pad-list">
              <li>Ihr kommt mit einem eigenen Anliegen auf die Website.</li>
              <li>Ihr seid vielleicht unsicher, gestresst oder erschöpft.</li>
              <li>Probiert den Chat mit verschiedenen Anliegen aus.</li>
              <li>Nutzt ihn so, wie es sich für euch richtig anfühlt.</li>
            </ul>
          </details>

          <details>
            <summary>Teil 2: Kurze Fragen</summary>
            <div className="pad-card">
              <h3>Wie hast du dich im Chat gefühlt?</h3>
              <textarea
                placeholder="Stichpunkte..."
                value={padNotes.good}
                onChange={(e) => setPadNotes((p) => ({ ...p, good: e.target.value }))}
                onKeyDown={(e) => handlePadEnter(e, "good")}
              />
            </div>
            <div className="pad-card">
              <h3>Was hat dir gutgetan oder entlastet?</h3>
              <textarea
                placeholder="Stichpunkte..."
                value={padNotes.challenges}
                onChange={(e) => setPadNotes((p) => ({ ...p, challenges: e.target.value }))}
                onKeyDown={(e) => handlePadEnter(e, "challenges")}
              />
            </div>
            <div className="pad-card">
              <h3>Was hat dich gestoppt oder irritiert?</h3>
              <textarea
                placeholder="Stichpunkte..."
                value={padNotes.ideas}
                onChange={(e) => setPadNotes((p) => ({ ...p, ideas: e.target.value }))}
                onKeyDown={(e) => handlePadEnter(e, "ideas")}
              />
            </div>
            <div className="pad-card">
              <h3>Wo hast du dich ernst genommen gefühlt?</h3>
              <textarea
                placeholder="Stichpunkte..."
                value={padNotes.safety}
                onChange={(e) => setPadNotes((p) => ({ ...p, safety: e.target.value }))}
                onKeyDown={(e) => handlePadEnter(e, "safety")}
              />
            </div>
            <div className="pad-card">
              <h3>Wo eher nicht?</h3>
              <textarea
                placeholder="Stichpunkte..."
                value={padNotes.questions}
                onChange={(e) => setPadNotes((p) => ({ ...p, questions: e.target.value }))}
                onKeyDown={(e) => handlePadEnter(e, "questions")}
              />
            </div>
          </details>

          <details>
            <summary>Teil 3: Übertragung in die Praxis</summary>
            <ul className="pad-list">
              <li>Könnt ihr euch so einen Chatbot für eure Strukturen vorstellen?</li>
              <li>Warum ja – oder warum nicht?</li>
              <li>Was könnte so ein Chatbot sinnvoll übernehmen?</li>
              <li>Wo seht ihr klare Grenzen?</li>
            </ul>
            <div className="pad-card">
              <h3>Stichpunkte</h3>
              <textarea
                placeholder="Bulletpoints..."
                onKeyDown={(e) => handlePadEnter(e, "ideas")}
                value={padNotes.ideas}
                onChange={(e) => setPadNotes((p) => ({ ...p, ideas: e.target.value }))}
              />
            </div>
          </details>

          <details>
            <summary>Teil 4: Offener Austausch zu KI</summary>
            <ul className="pad-list">
              <li>Wo nutzt ihr KI in eurer Arbeit heute schon?</li>
              <li>Wofür ganz konkret?</li>
              <li>Gibt es Bereiche, in denen ihr KI bewusst nicht nutzt?</li>
              <li>Gibt es bei euch Regeln oder Absprachen zum KI-Einsatz?</li>
              <li>Gerne auch Praxisbeispiele (z.B. über Zoom).</li>
            </ul>
            <div className="pad-card">
              <h3>Stichpunkte</h3>
              <textarea
                placeholder="Bulletpoints..."
                onKeyDown={(e) => handlePadEnter(e, "safety")}
                value={padNotes.safety}
                onChange={(e) => setPadNotes((p) => ({ ...p, safety: e.target.value }))}
              />
            </div>
          </details>
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
