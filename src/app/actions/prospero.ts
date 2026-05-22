"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export interface ProsperoMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(role: string): string {
  const base = `Ets el Próspero, l'assistent intel·ligent del Portal Prospectia.
Ets empàtic, concís i pràctic. Respons sempre en l'idioma de la pregunta (català o castellà).
No facis llistes llargues. Respostes breus i útils, màxim 3 paràgrafs.
Data actual: ${new Date().toLocaleDateString("ca-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`;

  if (role === "OWNER" || role === "CONSIGLIERE") {
    return `${base}

L'usuari és el propietari/gestor de Prospectia. Tens accés total al portal.
Pots ajudar amb:
- BRÚIXOLA: objectius, projectes, KPIs, actors, diagnòstic IA, anamnesi estratègica, focus, bloquejos
- DELEGATS: gestió del equip, rendiment, assignacions, autofacturas
- CRM: prospectos, clients, calendari, emails
- HOLDED: factures, pedidos, productes
- SISTEMA: analítica IA, performance, admin
- NAVEGACIÓ: com usar qualsevol mòdul del portal

Si l'usuari pregunta sobre Brúixola o estratègia, menciona que pot completar l'Anamnesi Estratègica per obtenir un diagnòstic IA de l'empresa.`;
  }

  if (role === "KOL" || role === "COORDINATOR") {
    return `${base}

L'usuari és delegat KOL/Coordinador de Prospectia.
Pots ajudar amb:
- La seva cartera de clients i prospectes
- Pedidos i seguiment de vendes
- Rendiment i comissions
- Gestió del seu equip de delegats subordinats
- Analítica IA del seu territori
- Autofacturas i facturació
- Navegació per les seccions que té disponibles

No tens accés a informació d'Estratègia ni Sistema global.`;
  }

  // DELEGATE (basic)
  return `${base}

L'usuari és delegat comercial de Prospectia.
Pots ajudar amb:
- El seu dashboard personal (vendes, rendiment, cartera)
- Pedidos: com crear, modificar i gestionar comandes
- Clients i prospectos: CRM personal
- Calendari i seguiment d'activitat
- Autofacturas i les seves factures
- Navegació per les seccions que té disponibles al portal

Respons de manera motivadora i professional.`;
}

async function callProsperoAI(
  messages: ProsperoMessage[],
  systemPrompt: string
): Promise<string> {
  // Try Anthropic first, fallback to OpenAI
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (res.ok) {
      const data = await res.json() as { content: Array<{ type: string; text: string }> };
      return data.content.find(b => b.type === "text")?.text ?? "No he pogut respondre.";
    }
  }

  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0]?.message?.content ?? "No he pogut respondre.";
    }
    const errText = await res.text();
    throw new Error(`OpenAI error: ${errText.slice(0, 200)}`);
  }

  throw new Error("No s'ha configurat cap API key d'IA (ANTHROPIC_API_KEY o OPENAI_API_KEY).");
}

export async function sendProsperoMessage(
  history: ProsperoMessage[],
  newMessage: string
): Promise<{ reply: string } | { error: string }> {
  const profile = await getProfile();
  if (!profile) return { error: "No autenticat" };

  const systemPrompt = buildSystemPrompt(profile.role);
  const messages: ProsperoMessage[] = [
    ...history.slice(-10), // keep last 10 turns for context
    { role: "user", content: newMessage },
  ];

  try {
    const reply = await callProsperoAI(messages, systemPrompt);
    return { reply };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error IA" };
  }
}
