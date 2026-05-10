"use client";

import { useEffect, useRef } from "react";
import type { Persona } from "@/app/actions/ecosistema";

// Orbital radii per categoria
const CAT_RADIUS: Record<string, number> = {
  familia:    72,
  nucli:      135,
  estrategic: 198,
  expansio:   252,
  drenant:    295,
};

// Warm light colors per categoria
const CAT_COLORS: Record<string, string> = {
  familia:    "#8B5A28",
  nucli:      "#7D1120",
  estrategic: "#A87830",
  expansio:   "#2A6A8A",
  drenant:    "#5A5A6A",
};

const CAT_RGB: Record<string, string> = {
  familia:    "139,90,40",
  nucli:      "125,17,32",
  estrategic: "168,120,48",
  expansio:   "42,106,138",
  drenant:    "90,90,106",
};

const CATEGORIES = ["familia", "nucli", "estrategic", "expansio", "drenant"] as const;

interface Props {
  persones: Persona[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

type Position = {
  p: Persona;
  x: number;
  y: number;
  baseAngle: number;
  r: number;
  color: string;
  rgb: string;
  nodeR: number;
};

export function OrbitalMap({ persones, onSelect, selectedId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef<Position[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Pre-compute positions
    const byCategory: Record<string, Persona[]> = {};
    CATEGORIES.forEach(c => { byCategory[c] = []; });
    persones.forEach(p => { byCategory[p.categoria]?.push(p); });

    posRef.current = [];
    CATEGORIES.forEach(cat => {
      const group = byCategory[cat];
      if (!group?.length) return;
      const radius = CAT_RADIUS[cat];
      const color = CAT_COLORS[cat];
      const rgb = CAT_RGB[cat];
      const nodeR = cat === "nucli" || cat === "familia" ? 16 : cat === "estrategic" ? 13 : 10;

      group.forEach((p, i) => {
        const baseAngle = (i / group.length) * Math.PI * 2 - Math.PI / 2;
        posRef.current.push({ p, x: cx, y: cy, baseAngle, r: radius, color, rgb, nodeR });
      });
    });

    // Stars
    const stars: Array<{ x: number; y: number; r: number; a: number }> = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.8 + 0.2,
      a: Math.random() * 0.3 + 0.05,
    }));

    function draw(t: number) {
      ctx!.clearRect(0, 0, W, H);

      // Warm light background
      ctx!.fillStyle = "#FAFAF8";
      ctx!.fillRect(0, 0, W, H);

      // Orbital rings
      CATEGORIES.forEach(cat => {
        const r = CAT_RADIUS[cat];
        const rgb = CAT_RGB[cat];
        const hasPeople = posRef.current.some(p => p.p.categoria === cat);

        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.strokeStyle = hasPeople
          ? `rgba(${rgb},0.18)`
          : "rgba(180,160,140,0.08)";
        ctx!.lineWidth = hasPeople ? 1 : 0.5;
        ctx!.setLineDash([3, 8]);
        ctx!.stroke();
        ctx!.setLineDash([]);
      });

      // Center ambient
      const centerGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 55);
      centerGlow.addColorStop(0, "rgba(125,17,32,0.12)");
      centerGlow.addColorStop(1, "rgba(125,17,32,0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx!.fillStyle = centerGlow;
      ctx!.fill();

      // Center pulse
      const pulse = 0.85 + Math.sin(t * 0.0018) * 0.15;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 9 * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = "#7D1120";
      ctx!.fill();

      // Center outer ring
      ctx!.beginPath();
      ctx!.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(125,17,32,0.25)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Center label
      ctx!.font = "bold 7px system-ui";
      ctx!.fillStyle = "rgba(92,72,60,0.45)";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText("TU", cx, cy + 22);

      // Connection lines & nodes
      posRef.current.forEach(pos => {
        const isDrenant = pos.p.categoria === "drenant";
        const drift = isDrenant ? 0 : Math.sin(t * 0.0003 + pos.baseAngle * 2) * 0.025;
        const angle = pos.baseAngle + drift;
        const px = cx + Math.cos(angle) * pos.r;
        const py = cy + Math.sin(angle) * pos.r;
        pos.x = px;
        pos.y = py;

        const isSelected = pos.p.id === selectedId;
        const confianca = pos.p.confianca ?? 3;
        const lineOpacity = isDrenant ? 0.06 : 0.05 + (confianca / 5) * 0.12;

        // Connection line
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(px, py);
        ctx!.strokeStyle = `rgba(${pos.rgb},${isSelected ? lineOpacity * 3 : lineOpacity})`;
        ctx!.lineWidth = isSelected ? 1.2 : 0.6;
        ctx!.stroke();

        // Stability glow
        const estabilitat = pos.p.estabilitat_kpi;
        const desgast = pos.p.desgast_energetic;
        if (!isDrenant && estabilitat != null && estabilitat >= 7) {
          const glow = ctx!.createRadialGradient(px, py, 0, px, py, pos.nodeR + 12);
          glow.addColorStop(0, `rgba(${pos.rgb},0.22)`);
          glow.addColorStop(1, `rgba(${pos.rgb},0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, pos.nodeR + 12, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();
        }

        if (desgast != null && desgast >= 7) {
          const dangerGlow = ctx!.createRadialGradient(px, py, 0, px, py, pos.nodeR + 10);
          dangerGlow.addColorStop(0, "rgba(180,50,30,0.2)");
          dangerGlow.addColorStop(1, "rgba(180,50,30,0)");
          ctx!.beginPath();
          ctx!.arc(px, py, pos.nodeR + 10, 0, Math.PI * 2);
          ctx!.fillStyle = dangerGlow;
          ctx!.fill();
        }

        // Selection halo
        if (isSelected) {
          const halo = ctx!.createRadialGradient(px, py, pos.nodeR, px, py, pos.nodeR + 16);
          halo.addColorStop(0, `rgba(${pos.rgb},0.4)`);
          halo.addColorStop(1, `rgba(${pos.rgb},0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, pos.nodeR + 16, 0, Math.PI * 2);
          ctx!.fillStyle = halo;
          ctx!.fill();
        }

        // Node fill
        const fillAlpha = isDrenant ? 0.22 : 0.65;
        ctx!.beginPath();
        ctx!.arc(px, py, pos.nodeR, 0, Math.PI * 2);
        ctx!.fillStyle = isSelected
          ? pos.color
          : `rgba(${pos.rgb},${fillAlpha})`;
        ctx!.fill();

        // Node border
        ctx!.beginPath();
        ctx!.arc(px, py, pos.nodeR, 0, Math.PI * 2);
        ctx!.strokeStyle = isSelected
          ? "rgba(255,255,255,0.6)"
          : `rgba(${pos.rgb},0.4)`;
        ctx!.lineWidth = isSelected ? 1.5 : 0.8;
        ctx!.stroke();

        // Initials
        const initials = pos.p.nom.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
        ctx!.font = `${pos.p.categoria === "nucli" || pos.p.categoria === "familia" ? "bold 9px" : "bold 7px"} system-ui`;
        ctx!.fillStyle = isSelected ? "#FFF" : `rgba(255,255,255,${isDrenant ? 0.7 : 0.9})`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(initials, px, py);

        // Name label
        const firstName = pos.p.nom.split(" ")[0];
        ctx!.font = `${isSelected ? "bold " : ""}8px system-ui`;
        ctx!.fillStyle = isSelected
          ? "#1C1510"
          : `rgba(92,72,60,${isDrenant ? 0.55 : 0.8})`;
        ctx!.textBaseline = "top";
        ctx!.fillText(firstName, px, py + pos.nodeR + 4);
      });
    }

    let raf: number;
    function loop(t: number) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [persones, selectedId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    let closest: string | null = null;
    let minDist = 28;

    posRef.current.forEach(pos => {
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = pos.p.id;
      }
    });

    if (closest) onSelect(closest);
  }

  return (
    <canvas
      ref={canvasRef}
      width={620}
      height={620}
      onClick={handleClick}
      className="w-full cursor-pointer"
      style={{ maxWidth: "620px" }}
    />
  );
}
