import { Briefcase, TrendingUp, CircleDollarSign, Sparkles } from "lucide-react";

export const metadata = {
  title: "Investimentos — TheoFinance",
};

const TIPOS = [
  {
    titulo: "Renda fixa",
    descricao: "CDB, Tesouro, LCI/LCA, previdência.",
    icon: CircleDollarSign,
  },
  {
    titulo: "Renda variável",
    descricao: "Ações, ETFs, fundos imobiliários, BDRs.",
    icon: TrendingUp,
  },
  {
    titulo: "Cripto",
    descricao: "Bitcoin, altcoins e stablecoins.",
    icon: Sparkles,
  },
  {
    titulo: "Outros",
    descricao: "Imóveis, participações, empréstimos privados.",
    icon: Briefcase,
  },
];

export default function InvestimentosPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
          Em construção
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Investimentos</h1>
        <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
          Centralize aportes, rentabilidade e patrimônio aplicado do casal. Em
          breve você vai acompanhar performance por ativo, distribuição por
          classe e evolução ao longo do tempo.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {TIPOS.map(({ titulo, descricao, icon: Icon }) => (
          <div
            key={titulo}
            className="card card-hover p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary-subtle)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[var(--primary)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{titulo}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
                {descricao}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--gold-subtle)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[var(--gold)]" aria-hidden />
          </div>
          <div>
            <p className="font-medium">O que vem na próxima atualização</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Prévia das funções que estão sendo desenhadas.
            </p>
          </div>
        </div>
        <ul className="grid gap-3 text-sm text-[var(--text-muted)] sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            Cadastro de ativo com valor investido e valor atual
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            Cálculo automático de lucro/prejuízo por ativo
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            Distribuição por classe (pizza) e evolução (linha)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            Consolidação com o patrimônio total do casal
          </li>
        </ul>
      </section>
    </div>
  );
}
