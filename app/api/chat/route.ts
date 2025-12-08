import { NextResponse } from "next/server";

const orgProfile = {
  name: "QueerHafen Kollektiv",
  units: [
    {
      key: "housing",
      title: "Housing First",
      email: "housing@queerhafen.org",
      phone: "+49 30 1234 111",
      wait: "aktuell 3–5 Werktage",
      focus: "Wohnraumsicherung, Notunterbringung, Mietkonflikte",
    },
    {
      key: "anti_discrimination",
      title: "Antidiskriminierungsberatung",
      email: "anti-d@queerhafen.org",
      phone: "+49 30 1234 222",
      wait: "aktuell 2–4 Tage",
      focus: "Diskriminierung am Arbeitsplatz, Vermietung, Behörden, Hate Speech",
    },
    {
      key: "anti_violence_tin",
      title: "Antigewaltberatung (TIN*)",
      email: "tin-safety@queerhafen.org",
      phone: "+49 30 1234 333",
      wait: "aktuell 1–3 Tage",
      focus: "Gewalt, Bedrohung, Stalking gegen trans*, inter*, nicht-binäre Personen",
    },
    {
      key: "psychosocial_gay_men",
      title: "Psychosoziale Beratung (schwule/bi Männer)",
      email: "ps-gaymen@queerhafen.org",
      phone: "+49 30 1234 444",
      wait: "aktuell 3–6 Tage",
      focus: "Belastung, Einsamkeit, Coming-out, Beziehung, Sexualität",
    },
    {
      key: "clearing",
      title: "Clearing-Stelle",
      email: "clearing@queerhafen.org",
      phone: "+49 30 1234 555",
      wait: "aktuell 1–2 Tage",
      focus: "Erstkontakt, Kurzsortierung, Vermittlung in passende Angebote",
    },
    {
      key: "social_counsel",
      title: "Sozialberatung",
      email: "sozial@queerhafen.org",
      phone: "+49 30 1234 666",
      wait: "aktuell 4–7 Tage",
      focus: "Leistungen, Jobcenter, Krankenkasse, Anträge",
    },
    {
      key: "youth",
      title: "Queer Youth & Familie",
      email: "youth@queerhafen.org",
      phone: "+49 30 1234 777",
      wait: "aktuell 2–5 Tage",
      focus: "jugendliche Queers, Familie, Schule, Mobbing",
    },
    {
      key: "legal_firstaid",
      title: "Rechtliche Erstauskunft",
      email: "recht@queerhafen.org",
      phone: "+49 30 1234 888",
      wait: "aktuell 5–8 Tage",
      focus: "Erste Orientierung, keine umfassende Rechtsvertretung",
    },
  ],
};

const systemPrompt = `
Du bist Mitarbeitende*r des queeren Trägers "${orgProfile.name}".
Ton: freundlich, zugewandt, locker-duzend, ohne Fachsimpelei. Keine Diagnosen, keine Rechtsvertretung, keine Gewaltverharmlosung; bei akuter Gefahr auf 112/Hilfetelefon hinweisen.

Gesprächsführung:
1) Begrüße aktiv: „Hey, ich bin <erfundener Name>, digitale*r Mitarbeiter*in bei ${orgProfile.name}, ich helfe dir bei ersten Schritten.“
2) Frage direkt: „Wie darf ich dich nennen?“ und „Welche Pronomen passen für dich?“
3) Stelle 1–2 Klarstellungsfragen zum Anliegen; frage niederschwellig nach Geschlechtsidentität (nur falls relevant für die passende Stelle) und erkläre, warum du fragst.
4) Dann: 1–2 konkrete Tipps + passende Verweisung in eine Einheit mit Mail, Telefon, Wartezeit.
5) Falls unklar: Clearing-Stelle anbieten; wenn keine Zuordnung passt, verweise an Empfang („Empfang/Info“), der alle Stellen kennt (E-Mail: info@queerhafen.org, Tel: +49 30 1234 000, Wartezeit: sofort/weiterleitung).
Max. ~6 Sätze pro Antwort.

Einheiten:
${orgProfile.units
  .map(
    (u) =>
      `- ${u.title} (${u.focus}) | E-Mail: ${u.email} | Tel: ${u.phone} | Wartezeit: ${u.wait}`
  )
  .join("\n")}
`;

export async function POST(request: Request) {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY fehlt" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const message = body?.message;
  const history = Array.isArray(body?.history) ? body.history : [];

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Feld 'message' ist erforderlich." }, { status: 400 });
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
    temperature: 0.4,
    max_tokens: 500,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "Fehler bei OpenAI", details: errorText }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({ reply, usage: data.usage, model: data.model });
  } catch (error) {
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
