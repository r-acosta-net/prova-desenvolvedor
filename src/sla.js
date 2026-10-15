// SLA restante de uma tarefa, para o farol da tela.
//
// O SLA é contado em dias úteis no horário de Brasília: cada dia útil vale
// 24 h, fim de semana e feriado não consomem prazo, e o prazo termina às
// 23:59:59 do dia final. Contar só dias inteiros daria, num SLA de 3 dias,
// apenas 100%, 67% e 33% — o vermelho (0–19%) nunca apareceria.
import { prazoSLA, ehDiaUtil, somarDias } from './prazo.js';

const DIA_EM_SEGUNDOS = 24 * 60 * 60;

const relogioDeBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Data ('YYYY-MM-DD') e segundos desde a meia-noite, no horário de Brasília. */
function emBrasilia(agora) {
  if (!(agora instanceof Date) || Number.isNaN(agora.getTime())) {
    throw new TypeError(`agora inválido: ${String(agora)}. Use um Date.`);
  }
  const p = Object.fromEntries(relogioDeBrasilia.formatToParts(agora).map(({ type, value }) => [type, value]));
  return { data: `${p.year}-${p.month}-${p.day}`, segundos: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second) };
}

/** Quantos dias úteis há depois de `de` até `ate`, inclusive. */
function diasUteisEntre(de, ate, feriados) {
  let n = 0;
  for (let d = somarDias(de, 1); d <= ate; d = somarDias(d, 1)) if (ehDiaUtil(d, feriados)) n++;
  return n;
}

/**
 * @returns {{ inicio: string, final: string, percentual: number, horasRestantes: number,
 *             situacao: 'verde'|'amarelo'|'vermelho'|'estourado', diasUteisDeAtraso: number }}
 *   percentual: tempo útil restante ÷ tempo útil total, arredondado para baixo
 *   (assim a cor bate com o número mostrado: 59,7% aparece 59% e é amarelo).
 *   Farol: verde ≥ 60%, amarelo 20–59%, vermelho 0–19%, estourado depois do final.
 */
export function situacaoSLA({ criadaEm, dias, feriados, agora }) {
  const hoje = emBrasilia(agora);
  const final = prazoSLA(criadaEm, dias, feriados);
  const inicio = dias === 0 ? criadaEm : prazoSLA(criadaEm, 1, feriados);
  const naoContam = new Set(feriados);

  if (hoje.data > final) {
    return { inicio, final, percentual: 0, horasRestantes: 0, situacao: 'estourado', diasUteisDeAtraso: diasUteisEntre(final, hoje.data, naoContam) };
  }

  const total = dias * DIA_EM_SEGUNDOS;
  const restante = hoje.data < inicio
    ? total
    : (ehDiaUtil(hoje.data, naoContam) ? DIA_EM_SEGUNDOS - hoje.segundos : 0)
      + diasUteisEntre(hoje.data, final, naoContam) * DIA_EM_SEGUNDOS;

  const percentual = total === 0 ? 0 : Math.floor((restante * 100) / total);
  const situacao = percentual >= 60 ? 'verde' : percentual >= 20 ? 'amarelo' : 'vermelho';
  return { inicio, final, percentual, horasRestantes: restante / 3600, situacao, diasUteisDeAtraso: 0 };
}
