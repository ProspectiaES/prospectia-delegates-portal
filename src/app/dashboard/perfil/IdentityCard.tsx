"use client";

import { useState, useEffect, useRef, useActionState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl, updateProfileData } from "@/app/actions/profile";
import type { ProfileUpdateState } from "@/app/actions/profile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  nif: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  iban: string | null;
  avatar_url: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeOfDayIcon(h: number) {
  if (h >= 6  && h < 12) return { icon: "🌤", label: "Buenos días" };
  if (h >= 12 && h < 15) return { icon: "☀️", label: "Buenas tardes" };
  if (h >= 15 && h < 21) return { icon: "🌇", label: "Buenas tardes" };
  return { icon: "🌙", label: "Buenas noches" };
}

function elapsed(since: Date): string {
  const ms = Date.now() - since.getTime();
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  const h  = Math.floor(m / 60);
  const d  = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner", ADMIN: "Administrador", DELEGATE: "Delegado",
  KOL: "KOL", COORDINATOR: "Coordinador", COM6: "Comisión 6",
};

// ─── Avatar upload sub-component ──────────────────────────────────────────────

function AvatarUpload({ profileId, currentUrl }: { profileId: string; currentUrl: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [avatarState, avatarAction] = useActionState<ProfileUpdateState | null, FormData>(updateAvatarUrl, null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const ext  = file.name.split(".").pop();
    const path = `${profileId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) { setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    setPreview(publicUrl + `?t=${Date.now()}`);

    // Submit the hidden form to persist the URL in the profiles table
    if (formRef.current) {
      (formRef.current.querySelector('[name="avatar_url"]') as HTMLInputElement).value = publicUrl;
      formRef.current.requestSubmit();
    }
    setUploading(false);
  }

  return (
    <div className="relative group w-24 h-24 shrink-0">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#F3F4F6]">
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#8E0E1A]">
            <span className="text-3xl font-bold text-white select-none">P</span>
          </div>
        )}
      </div>

      <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        {uploading ? (
          <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity=".25" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="white" aria-hidden>
            <path d="M4 14l3-3 2.5 2.5L13 9l3 3V16H4v-2zm6-8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
          </svg>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFile} />
      </label>

      {/* Hidden form to persist avatar URL */}
      <form ref={formRef} action={avatarAction} className="hidden">
        <input type="hidden" name="avatar_url" defaultValue="" />
      </form>
      {avatarState?.error && (
        <p className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-[#8E0E1A]">{avatarState.error}</p>
      )}
    </div>
  );
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock({ sessionStart }: { sessionStart: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { icon, label } = timeOfDayIcon(now.getHours());
  const dateStr = now.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const elapsedStr = elapsed(sessionStart);

  return (
    <div className="flex flex-col items-end gap-0.5 shrink-0 text-right">
      <div className="flex items-center gap-1.5">
        <span className="text-lg leading-none">{icon}</span>
        <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#0A0A0A] tabular-nums tracking-tight">{timeStr}</p>
      <p className="text-xs text-[#6B7280] capitalize">{dateStr}</p>
      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle animate-pulse" />
        Conectado hace {elapsedStr}
      </p>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function ProfileEditForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ProfileUpdateState | null, FormData>(updateProfileData, null);

  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  const fields = [
    { name: "full_name",   label: "Nombre",     defaultValue: profile.full_name,   type: "text" },
    { name: "email",       label: "Email",      defaultValue: profile.email,       type: "email" },
    { name: "phone",       label: "Teléfono",   defaultValue: profile.phone,       type: "tel" },
    { name: "nif",         label: "NIF",        defaultValue: profile.nif,         type: "text" },
    { name: "city",        label: "Ciudad",     defaultValue: profile.city,        type: "text" },
    { name: "address",     label: "Dirección",  defaultValue: profile.address,     type: "text" },
    { name: "postal_code", label: "C.P.",       defaultValue: profile.postal_code, type: "text" },
    { name: "iban",        label: "IBAN",       defaultValue: profile.iban,        type: "text" },
  ];

  if (!editing) {
    return (
      <div className="mt-6 space-y-1">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          {fields.map(f => (
            <div key={f.name} className="flex flex-col">
              <dt className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{f.label}</dt>
              <dd className="text-sm text-[#0A0A0A] font-medium">
                {f.defaultValue || <span className="text-[#D1D5DB]">—</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-[#6B7280] hover:text-[#8E0E1A] transition-colors"
          >
            Editar datos →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-3">
      {state?.error && (
        <p className="text-xs text-[#8E0E1A] bg-red-50 rounded px-3 py-2">{state.error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.name}>
            <label className="block text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">{f.label}</label>
            <input
              name={f.name}
              type={f.type}
              defaultValue={f.defaultValue ?? ""}
              className="w-full h-8 rounded-lg border border-[#E5E7EB] px-2.5 text-sm text-[#0A0A0A] focus:border-[#8E0E1A] focus:outline-none focus:ring-2 focus:ring-[#8E0E1A]/10 transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="h-8 px-4 rounded-lg bg-[#8E0E1A] text-xs font-semibold text-white hover:bg-[#6B0A14] disabled:opacity-60 transition-colors"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-8 px-4 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IdentityCard({ profile, sessionStart }: { profile: Profile; sessionStart: Date }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* Header band */}
      <div className="h-20 bg-gradient-to-br from-[#8E0E1A] to-[#6B0A14]" />

      <div className="px-6 pb-6">
        {/* Avatar + clock row */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <AvatarUpload profileId={profile.id} currentUrl={profile.avatar_url} />
          <LiveClock sessionStart={sessionStart} />
        </div>

        {/* Name + role */}
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A] tracking-tight">{profile.full_name || "—"}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF2F2] text-[#8E0E1A]">
              {ROLE_LABEL[profile.role] ?? profile.role}
            </span>
            {profile.email && (
              <span className="text-xs text-[#6B7280]">{profile.email}</span>
            )}
          </div>
        </div>

        <ProfileEditForm profile={profile} />
      </div>
    </div>
  );
}
