import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Sem conexão — TheoFinance",
  description: "Você está sem internet no momento.",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)]">
          <WifiOff className="w-7 h-7 text-[var(--color-text-muted)]" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sem conexão
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Você está offline. Verifique sua internet para acessar os dados em
            tempo real. Algumas páginas já visitadas continuam disponíveis no
            cache.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition"
          >
            Tentar abrir dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-card)] transition"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
