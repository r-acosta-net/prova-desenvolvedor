/** Gera o CSV das tarefas para o financeiro abrir no Excel. */
export function gerarCSV(tarefas) {
  const linhas = tarefas.map((t) => [t.id, t.titulo, t.status, t.criada_em].join(','));
  return ['id,titulo,status,criada_em', ...linhas].join('\n');
}
