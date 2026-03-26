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

export default function PublicTasks() {
  const [tasks, setTasks] = useState([]);
  const [activeCategory, setActiveCategory] = useState("pdv");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const categoryMeta = useMemo(
    () => categories.find((item) => item.id === activeCategory),
    [activeCategory]
  );

  useEffect(() => {
    loadTasks();
  }, [activeCategory]);

  async function loadTasks() {
    setMessage("");
    const { data, error } = await supabase
      .from("tasks")
      .select("id, titulo, descricao, comentario, status, categoria, fotos, created_at")
      .eq("categoria", activeCategory)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Nao foi possivel carregar as tarefas publicas.");
      return;
    }
    setTasks(data ?? []);
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

  return (
    <main className="public-page">
      <header className="public-hero">
        <div>
          <span className="public-badge">Consulta publica</span>
          <h1>Painel de Tarefas</h1>
          <p className="muted">Visualize as atividades registradas da loja.</p>
        </div>
        <a className="button ghost" href="/admin">Acessar area interna</a>
      </header>

      <section className="public-grid">
        <aside className="public-sidebar">
          <h3>Categorias</h3>
          <div className="menu">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeCategory ? "menu-item active" : "menu-item"}
                onClick={() => setActiveCategory(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.desc}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="public-content">
          <div className="content-header">
            <div>
              <h2>{categoryMeta?.label}</h2>
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
          </div>

          <section className="card">
            <div className="list-header">
              <h3>Tarefas registradas</h3>
              <span className="muted">{filteredTasks.length} item(ns)</span>
            </div>
            {message && <p className="muted">{message}</p>}
            {filteredTasks.length === 0 && !message && (
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
                </article>
              ))}
            </div>
          </section>
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
