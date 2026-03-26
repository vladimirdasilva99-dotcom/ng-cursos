"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const categories = [
  { id: "pdv", label: "PDV (Caixas)", desc: "Atividades dos caixas e frente de loja." },
  { id: "impressoras", label: "Impressoras", desc: "Manutencao e ajustes de impressoes." },
  { id: "computadores", label: "Computadores da Gerencia", desc: "Equipamentos dos gerentes e setores." },
  { id: "chamados", label: "Chamados", desc: "Pendencias gerais e suporte." }
];

const statusOptions = [
  { id: "pendente", label: "Pendente" },
  { id: "em_trabalho", label: "Em trabalho" },
  { id: "concluido", label: "Concluido" }
];

const emptyForm = {
  titulo: "",
  descricao: "",
  comentario: "",
  status: "pendente",
  categoria: "pdv",
  files: []
};

export default function TaskAdmin() {
  const [session, setSession] = useState(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [activeCategory, setActiveCategory] = useState("pdv");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categoryMeta = useMemo(
    () => categories.find((item) => item.id === activeCategory),
    [activeCategory]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setTasks([]);
      return;
    }
    loadTasks();
  }, [session, activeCategory]);

  async function loadTasks() {
    setMessage("");
    const { data, error } = await supabase
      .from("tasks")
      .select("id, titulo, descricao, comentario, status, categoria, fotos, created_at, updated_at")
      .eq("categoria", activeCategory)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Nao foi possivel carregar as tarefas.");
      return;
    }
    setTasks(data ?? []);
  }

  async function signIn(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const raw = loginId.trim();
    let emailToUse = raw;
    if (!raw.includes("@")) {
      const response = await fetch("/api/resolve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: raw })
      });
      if (!response.ok) {
        setAuthMessage("Usuario nao encontrado.");
        setAuthLoading(false);
        return;
      }
      const data = await response.json();
      emailToUse = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password
    });

    if (error) {
      setAuthMessage("Login invalido. Verifique o e-mail e a senha.");
    }
    setAuthLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function resetForm() {
    setForm({ ...emptyForm, categoria: activeCategory });
    setEditing(null);
  }

  async function handleCreateOrUpdate(event) {
    event.preventDefault();
    if (!form.titulo.trim()) {
      setMessage("Informe um titulo para a tarefa.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      let photoUrls = editing?.fotos ?? [];
      if (editing) {
        if (form.files.length > 0) {
          const newUrls = await uploadFiles(form.files, editing.id);
          photoUrls = [...photoUrls, ...newUrls];
        }
        const { error } = await supabase
          .from("tasks")
          .update({
            titulo: form.titulo,
            descricao: form.descricao,
            comentario: form.comentario,
            status: form.status,
            categoria: form.categoria,
            fotos: photoUrls,
            updated_at: new Date().toISOString()
          })
          .eq("id", editing.id);

        if (error) {
          throw error;
        }
        setMessage("Tarefa atualizada com sucesso.");
      } else {
        const taskId = crypto.randomUUID();
        if (form.files.length > 0) {
          photoUrls = await uploadFiles(form.files, taskId);
        }
        const { error } = await supabase.from("tasks").insert({
          id: taskId,
          titulo: form.titulo,
          descricao: form.descricao,
          comentario: form.comentario,
          status: form.status,
          categoria: form.categoria,
          fotos: photoUrls,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (error) {
          throw error;
        }
        setMessage("Tarefa criada com sucesso.");
      }

      resetForm();
      await loadTasks();
    } catch (err) {
      setMessage(`Erro ao salvar: ${err.message ?? "tente novamente"}`);
    }

    setSaving(false);
  }

  async function uploadFiles(fileList, taskId) {
    const bucket = "task-photos";
    const uploaded = [];

    for (let index = 0; index < fileList.length; index += 1) {
      const file = fileList[index];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${taskId}/${Date.now()}-${index}-${safeName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        throw error;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) {
        uploaded.push(data.publicUrl);
      }
    }

    return uploaded;
  }

  function handleEdit(task) {
    setEditing(task);
    setForm({
      titulo: task.titulo ?? "",
      descricao: task.descricao ?? "",
      comentario: task.comentario ?? "",
      status: task.status ?? "pendente",
      categoria: task.categoria ?? activeCategory,
      files: []
    });
    setMessage("");
  }

  async function handleDelete(taskId) {
    const ok = window.confirm("Tem certeza que deseja excluir esta tarefa?");
    if (!ok) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      setMessage("Nao foi possivel excluir a tarefa.");
      return;
    }
    await loadTasks();
  }

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "todos" && task.status !== statusFilter) return false;
    if (query.trim()) {
      const term = query.trim().toLowerCase();
      return (
        String(task.titulo ?? "").toLowerCase().includes(term) ||
        String(task.descricao ?? "").toLowerCase().includes(term) ||
        String(task.comentario ?? "").toLowerCase().includes(term)
      );
    }
    return true;
  });

  if (!session) {
    return (
      <main className="login">
        <div className="login-card">
          <h1>Painel de Tarefas</h1>
          <p className="muted">Acesso para cadastrar e editar tarefas.</p>
          <form onSubmit={signIn} className="login-form">
            <div>
              <label>Usuario</label>
              <input
                className="input"
                type="text"
                placeholder="Ex: vltecnologia"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                required
              />
            </div>
            <div>
              <label>Senha</label>
              <input
                className="input"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="button" type="submit" disabled={authLoading}>
              {authLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          {authMessage && <p className="muted">{authMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">TF</div>
          <div>
            <h2>Painel de Tarefas</h2>
            <p className="muted">Acesso unico da equipe</p>
          </div>
        </div>
        <div className="menu">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeCategory ? "menu-item active" : "menu-item"}
              onClick={() => {
                setActiveCategory(item.id);
                resetForm();
              }}
            >
              <span>{item.label}</span>
              <small>{item.desc}</small>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <a className="button ghost" href="/">Ver publico</a>
          <button className="button ghost" type="button" onClick={signOut}>
            Sair
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div>
            <h1>{categoryMeta?.label}</h1>
            <p className="muted">{categoryMeta?.desc}</p>
          </div>
          <div className="filters">
            <input
              className="input"
              placeholder="Buscar tarefa..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="todos">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="card form-card">
          <div className="form-header">
            <h3>{editing ? "Editar tarefa" : "Nova tarefa"}</h3>
            {editing && (
              <button className="button ghost" type="button" onClick={resetForm}>
                Cancelar edicao
              </button>
            )}
          </div>
          <form onSubmit={handleCreateOrUpdate} className="grid-2">
            <div>
              <label>Titulo da tarefa</label>
              <input
                className="input"
                placeholder="Ex: Trocar bobina do PDV 02"
                value={form.titulo}
                onChange={(event) => setForm({ ...form, titulo: event.target.value })}
                required
              />
            </div>
            <div>
              <label>Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {statusOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Categoria</label>
              <select
                className="select"
                value={form.categoria}
                onChange={(event) => setForm({ ...form, categoria: event.target.value })}
              >
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Comentarios</label>
              <input
                className="input"
                placeholder="Ex: Peca chegou, aguardando instalacao"
                value={form.comentario}
                onChange={(event) => setForm({ ...form, comentario: event.target.value })}
              />
            </div>
            <div className="full">
              <label>Descricao</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="Detalhe o que precisa ser feito ou o que foi feito."
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
              />
            </div>
            <div className="full">
              <label>Fotos (pode selecionar varias)</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setForm({ ...form, files: Array.from(event.target.files ?? []) })
                }
              />
            </div>
            <div className="actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Salvando..." : editing ? "Atualizar tarefa" : "Salvar tarefa"}
              </button>
            </div>
          </form>
          {message && <p className="muted">{message}</p>}
        </section>

        <section className="card">
          <div className="list-header">
            <h3>Tarefas registradas</h3>
            <span className="muted">{filteredTasks.length} item(ns)</span>
          </div>
          {filteredTasks.length === 0 && (
            <p className="muted">Nenhuma tarefa encontrada para esta categoria.</p>
          )}
          <div className="task-list">
            {filteredTasks.map((task) => (
              <article key={task.id} className="task-card">
                <div className="task-head">
                  <div>
                    <h4>{task.titulo}</h4>
                    <p className="muted">Criado em {formatDate(task.created_at)}</p>
                  </div>
                  <span className={`status ${task.status}`}>
                    {statusOptions.find((opt) => opt.id === task.status)?.label ?? "Status"}
                  </span>
                </div>
                {task.descricao && <p>{task.descricao}</p>}
                {task.comentario && (
                  <p className="comment">
                    <strong>Comentario:</strong> {task.comentario}
                  </p>
                )}
                {Array.isArray(task.fotos) && task.fotos.length > 0 && (
                  <div className="photo-grid">
                    {task.fotos.map((url, index) => (
                      <img key={`${task.id}-foto-${index}`} src={url} alt="Foto da tarefa" />
                    ))}
                  </div>
                )}
                <div className="task-actions">
                  <button className="button secondary" type="button" onClick={() => handleEdit(task)}>
                    Editar
                  </button>
                  <button className="button ghost" type="button" onClick={() => handleDelete(task.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
