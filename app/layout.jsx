import "./globals.css";

export const metadata = {
  title: "Painel de Tarefas",
  description: "Sistema simples para registrar tarefas da loja"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
