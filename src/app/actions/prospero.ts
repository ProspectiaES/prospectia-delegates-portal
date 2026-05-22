"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export interface ProsperoMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(role: string, lang: "es" | "ca" = "es"): string {
  const langInstruction = lang === "ca"
    ? "Respons SEMPRE en català, independentment de l'idioma de la pregunta."
    : "Responde SIEMPRE en castellano, independientemente del idioma de la pregunta.";
  const base = `Eres Próspero, el asistente inteligente del Portal Prospectia.
${langInstruction}
Eres empático, conciso y práctico. No hagas listas largas. Respuestas breves y útiles, máximo 3 párrafos.
Fecha actual: ${new Date().toLocaleDateString(lang === "ca" ? "ca-ES" : "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`;

  if (role === "OWNER" || role === "CONSIGLIERE") {
    return `${base}

El usuario es el propietario/gestor de Prospectia. Tienes acceso total al portal.
Puedes ayudar con:
- BRÚIXOLA (estrategia): objetivos, proyectos, KPIs, actores, diagnóstico IA, anamnesi estratégica, focus, bloqueos
- DELEGADOS: gestión del equipo, rendimiento, asignaciones, autofacturas
- CRM: prospectos, clientes, calendario, emails de seguimiento
- HOLDED: facturas, pedidos, productos, sincronización
- SISTEMA: analítica IA, performance, administración
- NAVEGACIÓN: cómo usar cualquier módulo del portal

Si preguntan sobre Brúixola o estrategia, menciona que pueden completar la Anamnesi Estratègica para obtener un diagnóstico IA de la empresa.`;
  }

  if (role === "KOL" || role === "COORDINATOR") {
    return `${base}

El usuario es delegado KOL/Coordinador de Prospectia.
Puedes ayudar con:
- Su cartera de clientes y prospectos
- Pedidos y seguimiento de ventas
- Rendimiento y comisiones
- Gestión de su equipo de delegados subordinados
- Analítica IA de su territorio
- Autofacturas y facturación
- Navegación por las secciones disponibles

No tienes acceso a información de Estrategia ni Sistema global.`;
  }

  // DELEGATE (basic)
  return `${base}

El usuario es delegado comercial de Prospectia.
Puedes ayudar con:
- Su dashboard personal (ventas, rendimiento, cartera)
- Pedidos: cómo crear, modificar y gestionar comandas
- Clientes y prospectos: su CRM personal
- Calendario y seguimiento de actividad
- Autofacturas y sus facturas
- Navegación por las secciones disponibles

Responde de manera motivadora y profesional.`;
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
  newMessage: string,
  lang: "es" | "ca" = "es"
): Promise<{ reply: string } | { error: string }> {
  const profile = await getProfile();
  if (!profile) return { error: "No autenticat" };

  const systemPrompt = buildSystemPrompt(profile.role, lang);
  const messages: ProsperoMessage[] = [
    ...history.slice(-10),
    { role: "user", content: newMessage },
  ];

  try {
    const reply = await callProsperoAI(messages, systemPrompt);
    return { reply };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error IA" };
  }
}
