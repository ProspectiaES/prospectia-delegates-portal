"use client";

import { useEffect, useRef } from "react";
import type { Persona } from "@/app/actions/ecosistema";

const CAT_COLORS: Record<string, string> = {
  nucli:      "#7D1120",
  estrategic: "#A87830",
  expansio:   "#2A6A8A",
  drenant:    "#5A5A6A",
};

const CAT_RADIUS: Record<string, number> = {
  nucli:      100,
  estrategic: 175,
  expansio:   240,
  drenant:    240,
};

interface Props {
  persones: Persona[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function OrbitalMap({ persones, onSelect, selectedId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

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
    const positions: Array<{
      p: Persona; x: number; y: number; baseAngle: number; r: number; color: string;
    }> = [];

    const byCategory: Record<string, Persona[]> = {
      nucli: [], estrategic: [], expansio: [], drenant: [],
    };
    persones.forEach(p => { byCategory[p.categoria]?.push(p); });

    (["nucli", "estrategic", "expansio", "drenant"] as const).forEach(cat => {
      const group = byCategory[cat];
      const radius = CAT_RADIUS[cat];
      const color = CAT_COLORS[cat];
      group.forEach((p, i) => {
        const baseAngle = (i / Math.max(group.length, 1)) * Math.PI * 2 - Math.PI / 2;
        positions.push({ p, x: 0, y: 0, baseAngle, r: radius, color });
      });
    });

    function draw(t: number) {
      ctx!.clearRect(0, 0, W, H);

      // Orbital rings
      [100, 175, 240].forEach(r => {
        ctx!.beginPath();
        ctx!.arc(cx, cy, r, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(180,160,140,0.08)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });

      // Center dot
      const pulse = 0.8 + Math.sin(t * 0.002) * 0.2;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 8 * pulse, 0, Math.PI * 2);
      ctx!.fillStyle = "#7D1120";
      ctx!.fill();

      // Soft glow center
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 40);
      grad.addColorStop(0, "rgba(125,17,32,0.15)");
      grad.addColorStop(1, "rgba(125,17,32,0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();

      // Center label
      ctx!.font = "bold 8px system-ui";
      ctx!.fillStyle = "rgba(180,160,140,0.4)";
      ctx!.textAlign = "center";
      ctx!.fillText("TU", cx, cy + 20);

      // Persons
      positions.forEach(pos => {
        // Very subtle slow drift
        const drift = pos.p.categoria === "nucli" ? 0 : Math.sin(t * 0.0004 + pos.baseAngle) * 0.02;
        const angle = pos.baseAngle + drift;
        const px = cx + Math.cos(angle) * pos.r;
        const py = cy + Math.sin(angle) * pos.r;
        pos.x = px;
        pos.y = py;

        const isSelected = pos.p.id === selectedId;
        const nodeR = pos.p.categoria === "nucli" ? 18 : pos.p.categoria === "estrategic" ? 14 : 11;

        // Connection line
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(px, py);
        ctx!.strokeStyle = pos.p.categoria === "drenant"
          ? "rgba(90,90,106,0.08)"
          : `rgba(${hexToRgb(pos.color)},0.12)`;
        ctx!.lineWidth = isSelected ? 1.5 : 0.8;
        ctx!.stroke();

        // Node glow (selected)
        if (isSelected) {
          const glow = ctx!.createRadialGradient(px, py, 0, px, py, nodeR + 10);
          glow.addColorStop(0, `rgba(${hexToRgb(pos.color)},0.3)`);
          glow.addColorStop(1, `rgba(${hexToRgb(pos.color)},0)`);
          ctx!.beginPath();
          ctx!.arc(px, py, nodeR + 10, 0, Math.PI * 2);
          ctx!.fillStyle = glow;
          ctx!.fill();
        }

        // Node circle
        ctx!.beginPath();
        ctx!.arc(px, py, nodeR, 0, Math.PI * 2);
        ctx!.fillStyle = isSelected
          ? pos.color
          : `rgba(${hexToRgb(pos.color)},${pos.p.categoria === "drenant" ? 0.25 : 0.55})`;
        ctx!.fill();
        if (isSelected) {
          ctx!.strokeStyle = "#FFF";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
        }

        // Emoji or initials
        const initials = pos.p.nom.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
        ctx!.font = `${pos.p.categoria === "nucli" ? "bold 10px" : "bold 8px"} system-ui`;
        ctx!.fillStyle = isSelected ? "#FFF" : "rgba(255,255,255,0.85)";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(initials, px, py);

        // Name label
        ctx!.font = `${isSelected ? "bold " : ""}9px system-ui`;
        ctx!.fillStyle = isSelected ? "#1C1510" : "rgba(92,80,72,0.8)";
        ctx!.textBaseline = "top";
        ctx!.fillText(pos.p.nom.split(" ")[0], px, py + nodeR + 4);
      });
    }

    function loop(t: number) {
      timeRef.current = t;
      draw(t);
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [persones, selectedId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const byCategory: Record<string, Persona[]> = {
      nucli: [], estrategic: [], expansio: [], drenant: [],
    };
    persones.forEach(p => { byCategory[p.categoria]?.push(p); });

    let closest: string | null = null;
    let minDist = 30;

    (["nucli", "estrategic", "expansio", "drenant"] as const).forEach(cat => {
      const group = byCategory[cat];
      const radius = CAT_RADIUS[cat];
      group.forEach((p, i) => {
        const angle = (i / Math.max(group.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
        if (dist < minDist) {
          minDist = dist;
          closest = p.id;
        }
      });
    });

    if (closest) onSelect(closest);
  }

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      onClick={handleClick}
      className="w-full cursor-pointer"
      style={{ maxWidth: "500px" }}
    />
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
