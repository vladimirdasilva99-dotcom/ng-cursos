"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PublicPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase
        .from("public_students")
        .select("id, nome, data_fim")
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
                <th>Data de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents(students, query).map((student) => (
                <tr key={student.id}>
                  <td>{student.nome}</td>
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

function filteredStudents(students, query) {
  const term = query.trim().toLowerCase();
  if (!term) return students;
  return students.filter((student) =>
    String(student.nome ?? "").toLowerCase().includes(term)
  );
}
