"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#FEF2F2] flex items-center justify-center mb-6">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#8E0E1A" strokeWidth="2">
          <path d="M4 4l24 24M20.5 9a9 9 0 00-12.7 12.7" strokeLinecap="round"/>
          <path d="M8.5 5.5A15 15 0 0127.5 24" strokeLinecap="round"/>
          <circle cx="16" cy="28" r="1.5" fill="#8E0E1A" stroke="none"/>
        </svg>
      </div>
      <h1 className="text-xl font-bold text-[#0A0A0A] mb-2">Sin conexión</h1>
      <p className="text-sm text-[#6B7280] mb-6 max-w-xs">
        No hay conexión a internet. Vuelve a intentarlo cuando tengas señal.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-[#8E0E1A] text-white text-sm font-medium rounded-lg hover:bg-[#7A0B16] transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
