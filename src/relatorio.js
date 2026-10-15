// Os dias do relatório são no horário de Brasília. O fuso nomeado (e não um
// "-3" fixo) também acerta datas antigas, da época do horário de verão.
const diaEmBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});

/**
 * Vendas pagas de um dia 'YYYY-MM-DD' (horário de Brasília), uma por id.
 * A sincronização de data/vendas.json pode repetir a mesma venda; vale a
 * última ocorrência do id, que é a informação mais recente.
 */
function vendasPagasDoDia(vendas, dia) {
  const porId = new Map(vendas.map((v) => [v.id, v]));
  return [...porId.values()]
    .filter((v) => v.status === 'paga')
    .filter((v) => diaEmBrasilia.format(new Date(v.criada_em)) === dia);
}

/** Soma em centavos, para não acumular erro de ponto flutuante. */
function somar(vendas) {
  return vendas.reduce((centavos, v) => centavos + Math.round(v.valor * 100), 0) / 100;
}

/** Total vendido (só vendas pagas) em um dia 'YYYY-MM-DD'. */
export function totalDoDia(vendas, dia) {
  return somar(vendasPagasDoDia(vendas, dia));
}

/** Ticket médio do dia: total vendido ÷ número de vendas pagas. */
export function ticketMedio(vendas, dia) {
  const doDia = vendasPagasDoDia(vendas, dia);
  if (doDia.length === 0) return 0;
  return Math.round((somar(doDia) * 100) / doDia.length) / 100;
}

export function formatarBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
