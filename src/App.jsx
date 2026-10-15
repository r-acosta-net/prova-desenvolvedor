import { useEffect, useState } from 'react';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { listarTarefas } from './tarefas.js';
import { gerarCSV } from './exportar.js';

export function App() {
  const [empresaId, setEmpresaId] = useState(1);
  const [de, setDe] = useState('2026-09-01');
  const [ate, setAte] = useState('2026-10-31');
  const [avisoExportacao, setAvisoExportacao] = useState(null);
  // o aviso fala da lista exportada; com outro filtro ele já não vale
  useEffect(() => setAvisoExportacao(null), [empresaId, de, ate]);

  const lista = listarTarefas({ tarefas, empresas, empresaId, de, ate });

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Tarefas</h1>
        <button type="button" disabled={lista.length === 0} onClick={() => setAvisoExportacao(exportarCSV(lista, `tarefas-${de || 'inicio'}-a-${ate || 'fim'}.csv`))}>
          Exportar CSV
        </button>
      </header>
      {avisoExportacao && (
        <p
          role={avisoExportacao.ok ? 'status' : 'alert'}
          style={{ padding: '8px 12px', borderRadius: 4, color: avisoExportacao.ok ? '#14532d' : '#7f1d1d', background: avisoExportacao.ok ? '#dcfce7' : '#fee2e2' }}
        >
          {avisoExportacao.texto}
        </p>
      )}
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

/**
 * Baixa as tarefas mostradas na tela como CSV para o Excel e devolve o aviso
 * para a tela. O navegador não conta à página se o arquivo foi de fato salvo
 * (a pessoa pode cancelar a janela de salvar), então o sucesso possível de
 * afirmar é "arquivo gerado e download iniciado".
 */
function exportarCSV(tarefasDaTela, nomeDoArquivo) {
  try {
    const blob = new Blob([gerarCSV(tarefasDaTela)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeDoArquivo;
    document.body.append(link); // o Firefox só baixa se o link estiver na página
    link.click();
    link.remove();
    // O navegador lê o arquivo depois do clique, sem avisar quando: liberar a
    // URL cedo demais faz o download falhar (ERR_FILE_NOT_FOUND). 1 min sobra.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    const qtd = tarefasDaTela.length === 1 ? '1 tarefa' : `${tarefasDaTela.length} tarefas`;
    return { ok: true, texto: `Download iniciado: ${nomeDoArquivo} (${qtd}). Confira a pasta de downloads do navegador.` };
  } catch (erro) {
    console.error('Falha ao exportar CSV', erro);
    return { ok: false, texto: `Não foi possível gerar o arquivo CSV: ${erro.message}. Tente de novo; se continuar, avise o suporte.` };
  }
}
