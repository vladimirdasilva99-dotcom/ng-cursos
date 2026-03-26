"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabaseClient";

const initialForm = {
  nome: "",
  cpf: "",
  data_nascimento: "",
  curso: "",
  data_inicio: "",
  data_fim: ""
};

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState(initialForm);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const siteUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadStudents();
      loadRole();
    } else {
      setStudents([]);
      setRole("");
    }
  }, [session]);

  async function loadRole() {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session?.user?.id ?? "")
      .maybeSingle();
    if (!error && data?.role) {
      setRole(data.role);
    } else {
      setRole("");
    }
  }

  async function loadStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, nome, cpf, data_nascimento, curso, data_inicio, data_fim")
      .order("created_at", { ascending: false });
    if (error) {
      setMessage("Não foi possível carregar os alunos.");
      return;
    }
    const list = data ?? [];
    setStudents(list);
    if (list.length > 0) {
      await buildQr();
    }
  }

  async function buildQr() {
    const qrValue = siteUrl || "";
    if (!qrValue) return;
    const dataUrl = await QRCode.toDataURL(qrValue, { width: 220, margin: 1 });
    setQrDataUrl(dataUrl);
  }

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      setMessage("Login inválido. Verifique seu e-mail e senha.");
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      ...form,
      cpf: form.cpf.replace(/\D/g, "")
    };

    const { error } = await supabase.from("students").insert(payload);
    if (error) {
      setMessage(`Erro ao salvar: ${error.message}`);
    } else {
      setForm(initialForm);
      setMessage("Aluno cadastrado com sucesso.");
      await loadStudents();
      await buildQr();
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    const ok = window.confirm("Tem certeza que deseja excluir este aluno?");
    if (!ok) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      setMessage("Erro ao excluir.");
    } else {
      await loadStudents();
    }
  }

  if (!session) {
    return (
      <main className="container">
        <section className="card">
          <h2 className="section-title">Login do Administrador</h2>
          <p className="muted">Somente administradores podem cadastrar ou excluir alunos.</p>
          <form onSubmit={signIn} className="grid-2">
            <input
              className="input"
              type="email"
              placeholder="Email do admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="actions">
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
          {message && <p className="muted">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card">
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <div>
              <h2 className="section-title">Painel Administrativo</h2>
              <p className="muted">Acesso Administrativo</p>
              <p className="muted">Cadastre alunos e gere o QR Code público.</p>
            </div>
            <button className="button ghost" onClick={signOut}>
              Sair
            </button>
          </div>
      </section>

      <section className="card">
        <h3 className="section-title">Cadastrar Aluno</h3>
        <form onSubmit={handleSubmit} className="grid-2">
          <div>
            <label>Nome completo</label>
            <input
              className="input"
              placeholder="Ex: Maria da Silva"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div>
            <label>CPF (somente números)</label>
            <input
              className="input"
              placeholder="Ex: 12345678900"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Data de nascimento</label>
            <input
              className="input"
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Curso</label>
            <input
              className="input"
              placeholder="Ex: Técnico em Enfermagem"
              value={form.curso}
              onChange={(e) => setForm({ ...form, curso: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Data de início do curso</label>
            <input
              className="input"
              type="date"
              value={form.data_inicio}
              onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Data de conclusão do curso</label>
            <input
              className="input"
              type="date"
              value={form.data_fim}
              onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
              required
            />
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar aluno"}
            </button>
          </div>
        </form>
        {role !== "admin" && (
          <p className="muted">Seu usuário não está como administrador no banco.</p>
        )}
        {message && <p className="muted">{message}</p>}
      </section>

      <section className="card grid-2">
        <div>
          <h3 className="section-title">QR Code Público</h3>
          <p className="muted">
            Qualquer pessoa pode escanear e ver a lista pública.
          </p>
          {students.length > 0 && qrDataUrl && <img alt="QR Code" src={qrDataUrl} />}
          {students.length === 0 && <p className="muted">O QR Code aparece após o primeiro cadastro.</p>}
          {siteUrl && (
            <p className="muted">
              Endereço público: <strong>{siteUrl}</strong>
            </p>
          )}
        </div>

        <div className="qr">
          <h3 className="section-title">Lista de Alunos</h3>
          {students.length === 0 && <p>Nenhum aluno cadastrado.</p>}
          {students.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Curso</th>
                  <th>Conclusão</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.nome}</td>
                    <td>{student.curso}</td>
                    <td>{formatDate(student.data_fim)}</td>
                    <td>
                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => handleDelete(student.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}
