export default function BruixolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#09090B", color: "#E8EAF0" }}>
      {children}
    </div>
  );
}
