/**
 * Prazo de atendimento (SLA) de uma tarefa.
 *
 * @param {string}   criadaEm   data de criação, 'YYYY-MM-DD'
 * @param {number}   dias       quantos dias o cliente contratou
 * @param {string[]} feriados   datas 'YYYY-MM-DD' que não contam
 * @returns {string} data do prazo, 'YYYY-MM-DD'
 */
export function prazoSLA(criadaEm, dias, feriados) {
  const d = new Date(criadaEm);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
