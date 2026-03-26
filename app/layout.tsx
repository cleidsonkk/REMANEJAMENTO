import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Remanejamento Orçamentário | Prefeitura de Umbaúba",
  description: "Sistema interno para controle de remanejamento orçamentário entre secretarias.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
