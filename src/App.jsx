import { useState } from 'react';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { listarTarefas } from './tarefas.js';
import { gerarCSV } from './exportar.js';

export function App() {
  const [empresaId, setEmpresaId] = useState(1);
  const [de, setDe] = useState('2026-09-01');
  const [ate, setAte] = useState('2026-10-31');

  const lista = listarTarefas({ tarefas, empresas, empresaId, de, ate });

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Tarefas</h1>
        <button type="button" disabled={lista.length === 0} onClick={() => baixarCSV(lista, `tarefas-${de || 'inicio'}-a-${ate || 'fim'}.csv`)}>
          Exportar CSV
        </button>
      </header>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={empresaId} onChange={(e) => setEmpresaId(Number(e.target.value))}>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <label>De <input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label>Até <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
      </div>
      {lista.length === 0 ? (
        <p>Nenhuma tarefa no período.</p>
      ) : (
        <table width="100%" cellPadding={6}>
          <thead>
            <tr><th align="left">Data</th><th align="left">Tarefa</th><th align="left">Status</th></tr>
          </thead>
          <tbody>
            {lista.map((t) => (
              <tr key={t.id}><td>{t.criada_em}</td><td>{t.titulo}</td><td>{t.status}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

/** Baixa as tarefas mostradas na tela como CSV para o Excel. */
function baixarCSV(tarefasDaTela, nomeDoArquivo) {
  const blob = new Blob([gerarCSV(tarefasDaTela)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0); // depois que o download começou
}
