"use client";

import { CollapsibleCard } from "@/components/ui/CollapsibleCard";

const QUESTIONS = [
  {
    q: "¿Cuándo fue la última vez que contactaste a cada cliente dormido?",
    hint: "El primer paso para recuperarlos es volver a conectar. Una llamada de 5 minutos puede reactivar meses de pedidos.",
  },
  {
    q: "¿Sabes por qué dejaron de comprar?",
    hint: "Un cliente que no compra tiene una razón: precio, servicio, competencia, o simplemente se olvidó de ti.",
  },
  {
    q: "¿Qué novedad puedes ofrecer que no hayas mencionado antes?",
    hint: "Los nuevos lanzamientos o cambios de catálogo son la excusa perfecta para retomar el contacto.",
  },
  {
    q: "¿Ha cambiado el responsable de compras en alguno de tus clientes?",
    hint: "La persona con quien tenías relación puede haberse ido. Un nuevo contacto es una nueva oportunidad.",
  },
  {
    q: "¿Cuánta comisión generarías si reactivaras solo el 20% de tus dormidos?",
    hint: "Calcula el potencial — suele ser más de lo que imaginas, y ayuda a priorizar a quién llamar primero.",
  },
];

export function KeyQuestionsCard() {
  return (
    <CollapsibleCard title="Preguntas clave" subtitle="Para reflexionar y actuar">
      <ul className="divide-y divide-[#F3F4F6]">
        {QUESTIONS.map(({ q, hint }, i) => (
          <li key={i} className="px-5 py-4">
            <p className="text-sm font-semibold text-[#0A0A0A] leading-snug">{q}</p>
            <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed">{hint}</p>
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}
