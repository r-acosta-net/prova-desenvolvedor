/**
 * Lista as tarefas que a pessoa vê quando escolhe uma empresa no seletor.
 *
 * @param {object}   p
 * @param {Array}    p.tarefas   lista de tarefas (data/tarefas.json)
 * @param {Array}    p.empresas  lista de empresas (data/empresas.json)
 * @param {number}   p.empresaId empresa escolhida no seletor
 * @param {string}   p.de        data inicial, 'YYYY-MM-DD' (inclusive; '' = sem limite)
 * @param {string}   p.ate       data final, 'YYYY-MM-DD' (inclusive; '' = sem limite)
 * @returns {Array} tarefas ordenadas pela data de criação
 */
export function listarTarefas({ tarefas, empresas, empresaId, de, ate }) {
  const visiveis = empresaEDescendentes(empresas, empresaId);
  return tarefas
    .filter((t) => visiveis.has(t.empresa_id))
    .filter((t) => (!de || t.criada_em >= de) && (!ate || t.criada_em <= ate))
    .sort((a, b) => a.criada_em.localeCompare(b.criada_em) || a.id - b.id);
}

/** Ids da empresa e de todas as empresas abaixo dela na árvore. */
function empresaEDescendentes(empresas, empresaId) {
  const ids = new Set();
  if (!empresas.some((e) => e.id === empresaId)) return ids;

  const fila = [empresaId];
  while (fila.length > 0) {
    const atual = fila.shift();
    if (ids.has(atual)) continue; // árvore com ciclo: não visita duas vezes
    ids.add(atual);
    for (const e of empresas) {
      if (e.pai_id === atual) fila.push(e.id);
    }
  }
  return ids;
}
