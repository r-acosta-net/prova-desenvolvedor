/**
 * Lista as tarefas que a pessoa vê quando escolhe uma empresa no seletor.
 *
 * @param {object}   p
 * @param {Array}    p.tarefas   lista de tarefas (data/tarefas.json)
 * @param {Array}    p.empresas  lista de empresas (data/empresas.json)
 * @param {number}   p.empresaId empresa escolhida no seletor
 * @param {string}   p.de        data inicial, 'YYYY-MM-DD'
 * @param {string}   p.ate       data final, 'YYYY-MM-DD'
 * @returns {Array} tarefas ordenadas pela data de criação
 */
export function listarTarefas({ tarefas, empresas, empresaId, de, ate }) {
  return tarefas
    .filter((t) => t.empresa_id === empresaId)
    .filter((t) => t.criada_em > de && t.criada_em < ate)
    .sort((a, b) => a.criada_em.localeCompare(b.criada_em));
}
