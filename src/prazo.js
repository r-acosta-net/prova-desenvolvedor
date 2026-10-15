// Datas 'YYYY-MM-DD' são dias do calendário, sem hora nem fuso. As contas
// usam Date só em UTC: misturar UTC com horário local (new Date('YYYY-MM-DD')
// + setDate) perde ou ganha um dia na troca do horário de verão.

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true se `data` é 'YYYY-MM-DD' e existe no calendário. */
function dataValida(data) {
  const partes = typeof data === 'string' && FORMATO.exec(data);
  if (!partes) return false;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return ano > 0 && d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

/** 'YYYY-MM-DD' + n dias do calendário. */
export function somarDias(data, n) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + n)).toISOString().slice(0, 10);
}

/** Segunda a sexta, fora dos feriados. */
export function ehDiaUtil(data, feriados) {
  const diaDaSemana = new Date(`${data}T00:00:00Z`).getUTCDay();
  return diaDaSemana !== 0 && diaDaSemana !== 6 && !feriados.has(data);
}

/**
 * Prazo de atendimento (SLA) de uma tarefa, em dias úteis.
 *
 * O prazo começa a contar no dia seguinte à criação; dia útil é de segunda a
 * sexta, exceto os feriados informados. Com 0 dias, o prazo é a própria data
 * de criação. Se a lista de feriados não estiver vazia e a contagem entrar
 * num ano que não aparece nela, é erro: o prazo sairia errado em silêncio.
 *
 * @param {string}   criadaEm   data de criação, 'YYYY-MM-DD'
 * @param {number}   dias       quantos dias úteis o cliente contratou
 * @param {string[]} feriados   datas 'YYYY-MM-DD' que não contam
 * @returns {string} data do prazo, 'YYYY-MM-DD'
 */
export function prazoSLA(criadaEm, dias, feriados = []) {
  if (!dataValida(criadaEm)) {
    throw new RangeError(`criadaEm inválida: ${JSON.stringify(criadaEm)}. Use 'AAAA-MM-DD'.`);
  }
  if (!Number.isInteger(dias) || dias < 0) {
    throw new RangeError(`dias inválido: ${String(dias)}. Use um número inteiro de 0 em diante.`);
  }
  if (!Array.isArray(feriados) || !feriados.every(dataValida)) {
    throw new TypeError("feriados inválidos: use uma lista de datas 'AAAA-MM-DD'.");
  }

  const naoContam = new Set(feriados);
  const anosCarregados = new Set(feriados.map((f) => f.slice(0, 4)));
  let prazo = criadaEm;
  let contados = 0;
  while (contados < dias) {
    prazo = somarDias(prazo, 1);
    if (anosCarregados.size > 0 && !anosCarregados.has(prazo.slice(0, 4))) {
      throw new RangeError(`Feriados de ${prazo.slice(0, 4)} não carregados: rode npm run feriados -- ${prazo.slice(0, 4)}.`);
    }
    if (ehDiaUtil(prazo, naoContam)) contados++;
  }
  return prazo;
}
