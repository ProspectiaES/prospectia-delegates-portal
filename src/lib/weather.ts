"use client";

import { useState, useEffect } from "react";

export const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: "Despejado",            icon: "☀️" },
  1:  { label: "Mayormente despejado", icon: "🌤" },
  2:  { label: "Parcialmente nublado", icon: "⛅" },
  3:  { label: "Nublado",              icon: "☁️" },
  45: { label: "Niebla",               icon: "🌫" },
  48: { label: "Niebla con escarcha",  icon: "🌫" },
  51: { label: "Llovizna leve",        icon: "🌦" },
  53: { label: "Llovizna moderada",    icon: "🌦" },
  55: { label: "Llovizna intensa",     icon: "🌧" },
  61: { label: "Lluvia leve",          icon: "🌧" },
  63: { label: "Lluvia moderada",      icon: "🌧" },
  65: { label: "Lluvia intensa",       icon: "🌧" },
  71: { label: "Nevada leve",          icon: "🌨" },
  73: { label: "Nevada moderada",      icon: "🌨" },
  75: { label: "Nevada intensa",       icon: "❄️" },
  80: { label: "Chubascos leves",      icon: "🌦" },
  81: { label: "Chubascos moderados",  icon: "🌧" },
  82: { label: "Chubascos intensos",   icon: "⛈" },
  85: { label: "Chubascos de nieve",   icon: "🌨" },
  95: { label: "Tormenta",             icon: "⛈" },
  96: { label: "Tormenta con granizo", icon: "⛈" },
  99: { label: "Tormenta con granizo", icon: "⛈" },
};

export function wmoLookup(code: number) {
  return WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { label: "—", icon: "🌡" };
}

export interface WeatherData {
  temp: number;
  code: number;
  city: string;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const [meteoRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
              { headers: { "Accept-Language": "es" } },
            ),
          ]);
          const meteo = await meteoRes.json() as {
            current: { temperature_2m: number; weather_code: number };
          };
          const geo = await geoRes.json() as {
            address?: { city?: string; town?: string; village?: string; county?: string };
          };
          setWeather({
            temp: Math.round(meteo.current.temperature_2m),
            code: meteo.current.weather_code,
            city: geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.county ?? "",
          });
        } catch {
          // silently ignore
        }
      },
      () => setDenied(true),
      { timeout: 8000 },
    );
  }, []);

  return { weather, denied };
}
