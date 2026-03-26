"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PublicPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filtered = filteredStudents(students, query, dateFrom, dateTo);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("public_students")
        .select("id, nome, curso, data_fim")
        .order("data_fim", { ascending: false });

      if (!isMounted) return;
      if (fetchError) {
        setError("Não foi possível carregar a lista pública.");
      } else {
        setStudents(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="container">
      <section className="card">
        <h2 className="section-title">Lista Pública de Conclusão</h2>
        <p className="muted">
          Aqui aparece apenas o nome do aluno e a data de conclusão do curso.
        </p>
      </section>

      <section className="card">
      <div className="actions" style={{ marginBottom: 12 }}>
        <input
          className="input"
          type="text"
          placeholder="Buscar por nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className="input"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          className="input"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <button
          className="button"
          type="button"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
        >
          Exportar CSV
        </button>
        <button
          className="button ghost"
          type="button"
          onClick={() => {
            setQuery("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Limpar filtros
        </button>
      </div>
      {loading && <p>Carregando...</p>}
      {error && <p className="muted">{error}</p>}
      {!loading && !error && students.length === 0 && (
        <p>Nenhum aluno cadastrado ainda.</p>
      )}
      {!loading && !error && students.length > 0 && (
        <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Curso</th>
                <th>Data de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td>{student.nome}</td>
                  <td>{student.curso}</td>
                  <td>{formatDate(student.data_fim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
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

function filteredStudents(students, query, dateFrom, dateTo) {
  const term = query.trim().toLowerCase();
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;

  return students.filter((student) => {
    const nameOk = term
      ? String(student.nome ?? "").toLowerCase().includes(term)
      : true;
    if (!from && !to) return nameOk;
    const endDate = student.data_fim ? new Date(student.data_fim) : null;
    if (!endDate || Number.isNaN(endDate.getTime())) return false;
    const fromOk = from ? endDate >= from : true;
    const toOk = to ? endDate <= to : true;
    return nameOk && fromOk && toOk;
  });
}

function exportCsv(rows) {
  const header = ["Nome", "Curso", "Data de conclusão"];
  const lines = rows.map((row) => [
    String(row.nome ?? ""),
    String(row.curso ?? ""),
    formatDate(row.data_fim)
  ]);
  const csv = [header, ...lines]
    .map((cols) => cols.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lista-alunos.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}
