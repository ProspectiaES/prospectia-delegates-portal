import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { getLastSessions } from "@/app/actions/governador";
import { GovernadorClient } from "./GovernadorClient";

export default async function GovernadorPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== "OWNER") redirect("/dashboard");

  const lastSessions = await getLastSessions();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#050505" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#050505",
          backgroundImage:
            "radial-gradient(ellipse at 70% 0%, rgba(125,17,32,0.08) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 20% 100%, rgba(196,150,74,0.04) 0%, transparent 50%)",
          borderBottom: "1px solid #0E0E0E",
          padding: "40px 32px 36px",
        }}
      >
        {/* Nav */}
        <div className="flex items-center gap-5 mb-8">
          <Link
            href="/dashboard/diario"
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#252220",
              textDecoration: "none",
            }}
          >
            ← Diari
          </Link>
        </div>

        {/* Identity */}
        <div>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "#7D1120",
              marginBottom: "8px",
            }}
          >
            Sistema d&apos;Intel·ligència Personal
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 900,
              color: "#EDE8DF",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "12px",
            }}
          >
            El Governador
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "#3D3530",
              letterSpacing: "0.08em",
              lineHeight: 1.6,
              maxWidth: "480px",
            }}
          >
            No un assistent. No un coach. La veu del govern personal: directa,
            serena, estratègica. Creuament constant entre acció i direcció.
          </p>
        </div>

        {/* Status bar */}
        <div
          style={{
            marginTop: "28px",
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Focus", val: "Recentratge" },
            { label: "Seguiment", val: "Diari" },
            { label: "Coherència", val: "Valors · Missió" },
            { label: "Cos", val: "Entrenador" },
          ].map(item => (
            <div key={item.label}>
              <p
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#252220",
                  marginBottom: "2px",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "#4A4540",
                  letterSpacing: "0.1em",
                }}
              >
                {item.val}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modes */}
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "8px 32px 48px",
        }}
      >
        <GovernadorClient lastSessions={lastSessions} />
      </div>
    </div>
  );
}
