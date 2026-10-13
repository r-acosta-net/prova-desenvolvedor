/** Total vendido (só vendas pagas) em um dia 'YYYY-MM-DD'. */
export function totalDoDia(vendas, dia) {
  return vendas
    .filter((v) => v.status === 'paga')
    .filter((v) => v.criada_em.slice(0, 10) === dia)
    .reduce((soma, v) => soma + v.valor, 0);
}

/** Ticket médio do dia: total vendido ÷ número de vendas. */
export function ticketMedio(vendas, dia) {
  const doDia = vendas.filter((v) => v.criada_em.slice(0, 10) === dia);
  if (doDia.length === 0) return 0;
  return totalDoDia(vendas, dia) / doDia.length;
}

export function formatarBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
