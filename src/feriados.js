// Feriados nacionais vindos da BrasilAPI (https://brasilapi.com.br/docs#tag/Feriados-Nacionais).
//
// Atenção: a BrasilAPI marca Carnaval e Corpus Christi como "national", mas na
// esfera federal esses dias são ponto facultativo, não feriado. Seguimos a API
// (esses dias não contam no prazo) até a empresa decidir como quer tratá-los.

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

function dataDoAno(data, ano) {
  const partes = typeof data === 'string' && DATA.exec(data);
  if (!partes || Number(partes[1]) !== ano) return false;
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(data);
}

/**
 * Confere a resposta da API e devolve os feriados nacionais do ano, em ordem
 * de data, um por dia: [{ date, name, type }]. Resposta fora do esperado é
 * erro, para nunca gravar uma lista errada ou vazia.
 */
export function normalizarFeriados(resposta, ano) {
  const inesperada = (motivo) => new Error(`Resposta inesperada da API: ${motivo}.`);
  if (!Array.isArray(resposta)) throw inesperada('não é uma lista');

  const porData = new Map();
  for (const f of resposta) {
    if (!f || !dataDoAno(f.date, ano)) throw inesperada(`data inválida ou fora de ${ano}: ${JSON.stringify(f?.date)}`);
    if (typeof f.name !== 'string' || f.name.trim() === '') throw inesperada(`feriado sem nome em ${f.date}`);
    if (f.type === 'national' && !porData.has(f.date)) {
      porData.set(f.date, { date: f.date, name: f.name, type: f.type });
    }
  }
  if (porData.size === 0) throw inesperada(`nenhum feriado nacional em ${ano}`);
  return [...porData.values()].sort((a, b) => a.date.localeCompare(b.date));
}
