import "./globals.css";

export const metadata = {
  title: "NG Cursos",
  description: "Lista pública de alunos concluídos"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="page">
          <header className="header">
            <div className="brand">
              <div className="logo-box">
                <img src="/logo.png" alt="Logo NG Cursos" />
              </div>
              <div>
                <div className="title">NG Cursos</div>
                <div className="muted">Certificados e conclusão de cursos</div>
              </div>
            </div>
            <a className="badge" href="/admin">Área Administrativa</a>
          </header>
          {children}
          <footer className="footer">
            Sistema público de consulta. Somente informações autorizadas são exibidas.
          </footer>
        </div>
      </body>
    </html>
  );
}
