import { ProsperoAnalitic } from "@/components/ProsperoAnalitic";

export default function BruixolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFFFF", color: "#111827" }}>
      {children}
      <ProsperoAnalitic />
    </div>
  );
}
