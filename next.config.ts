import type { NextConfig } from "next";

const ROUTE_REDIRECTS: Array<[string, string]> = [
  ["/dashboard/accounts", "/dashboard/contas"],
  ["/dashboard/transactions", "/dashboard/transacoes"],
  ["/dashboard/reports", "/dashboard/relatorios"],
  ["/dashboard/savings-goals", "/dashboard/objetivos"],
  ["/dashboard/due-bills", "/dashboard/calendario"],
  ["/dashboard/settings", "/dashboard/configuracoes"],
  ["/dashboard/fixed-accounts", "/dashboard/contas-fixas"],
  ["/dashboard/debts", "/dashboard/dividas"],
  ["/dashboard/trash", "/dashboard/lixeira"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return ROUTE_REDIRECTS.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: true },
      { source: `${from}/:path*`, destination: `${to}/:path*`, permanent: true },
    ]);
  },
};

export default nextConfig;
