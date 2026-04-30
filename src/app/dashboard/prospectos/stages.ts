export type ProspectoStage =
  | "nuevo" | "contactado" | "interesado"
  | "propuesta" | "negociacion" | "ganado"
  | "seguimiento" | "perdido";

export const STAGES: {
  key: ProspectoStage;
  label: string;
  color: string;
  bg: string;
  dot: string;
}[] = [
  { key: "nuevo",        label: "Nuevo",        color: "text-[#6B7280]",   bg: "bg-[#F9FAFB]",    dot: "bg-[#9CA3AF]"   },
  { key: "contactado",   label: "Contactado",   color: "text-blue-700",    bg: "bg-blue-50",      dot: "bg-blue-500"    },
  { key: "interesado",   label: "Interesado",   color: "text-purple-700",  bg: "bg-purple-50",    dot: "bg-purple-500"  },
  { key: "propuesta",    label: "Propuesta",    color: "text-amber-700",   bg: "bg-amber-50",     dot: "bg-amber-500"   },
  { key: "negociacion",  label: "Negociación",  color: "text-orange-700",  bg: "bg-orange-50",    dot: "bg-orange-500"  },
  { key: "ganado",       label: "Ganado",       color: "text-emerald-700", bg: "bg-emerald-50",   dot: "bg-emerald-500" },
  { key: "seguimiento",  label: "Seguimiento",  color: "text-teal-700",    bg: "bg-teal-50",      dot: "bg-teal-500"    },
  { key: "perdido",      label: "Perdido",      color: "text-red-700",     bg: "bg-red-50",       dot: "bg-red-400"     },
];

export function stageCfg(s: ProspectoStage) {
  return STAGES.find(x => x.key === s) ?? STAGES[0];
}
