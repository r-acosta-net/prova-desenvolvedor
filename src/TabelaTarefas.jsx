// Colunas de SLA da tabela de tarefas: início, final (prazo) e SLA restante
// com farol. O SLA contratado é de 3 dias úteis.
import { useEffect, useState } from 'react';
import { situacaoSLA } from './sla.js';

export const SLA_DIAS_UTEIS = 3;

// Todos os data/feriados-<ano>.json gerados por `npm run feriados -- <ano>`:
// um ano novo entra sem mexer no código.
const arquivosDeFeriados = Object.values(import.meta.glob('../data/feriados-*.json', { eager: true, import: 'default' }));
const FERIADOS = arquivosDeFeriados.flatMap((a) => a.feriados.map((f) => f.date)).sort();
const ANOS_DE_FERIADOS = arquivosDeFeriados.map((a) => a.ano).sort().join(', ');

const SEM_QUEBRA = { whiteSpace: 'nowrap' };

const FAROL = {
  verde: { rotulo: 'No prazo', cor: '#14532d', fundo: '#dcfce7' },
  amarelo: { rotulo: 'Atenção', cor: '#713f12', fundo: '#fef9c3' },
  vermelho: { rotulo: 'Crítico', cor: '#7f1d1d', fundo: '#fecaca' },
  estourado: { rotulo: 'Estourado', cor: '#ffffff', fundo: '#7f1d1d' },
  concluida: { rotulo: 'Concluída', cor: '#374151', fundo: '#e5e7eb' },
};

/** A hora atual, renovada a cada minuto para o farol andar sozinho. */
function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return agora;
}

function tempoRestante(horas) {
  const minutos = Math.floor(horas * 60);
  const d = Math.floor(minutos / 1440);
  const h = Math.floor((minutos % 1440) / 60);
  const min = minutos % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${min}min`;
  return `${min}min`;
}

/** Pílula curta (situação + %) e, embaixo, o detalhe em texto menor. */
function Farol({ tipo, percentual, detalhe }) {
  const { rotulo, cor, fundo } = FAROL[tipo];
  return (
    <>
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, color: cor, background: fundo, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
        {rotulo}{percentual != null ? ` ${percentual}%` : ''}
      </span>
      {detalhe && <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2, whiteSpace: 'nowrap' }}>{detalhe}</div>}
    </>
  );
}

export function LegendaSLA() {
  return (
    <caption style={{ captionSide: 'bottom', textAlign: 'left', fontSize: 12, color: '#4b5563', paddingTop: 8 }}>
      SLA de {SLA_DIAS_UTEIS} dias úteis, contado a partir do dia seguinte à criação, no horário de Brasília (fim de semana e
      feriado não consomem prazo). Farol: verde 100–60%, amarelo 59–20%, vermelho 19–0%, estourado depois do prazo.
      Feriados nacionais da BrasilAPI ({ANOS_DE_FERIADOS}); Carnaval e Corpus Christi contam como feriado até a empresa decidir
      (na esfera federal são ponto facultativo).
    </caption>
  );
}

export function CabecalhoTarefas() {
  return (
    <tr>
      <th align="left">Criada em</th><th align="left">Tarefa</th><th align="left">Status</th>
      <th align="left">Início do SLA</th><th align="left">Final do SLA</th><th align="left">SLA restante</th>
    </tr>
  );
}

export function LinhasTarefas({ lista }) {
  const agora = useAgora();
  return lista.map((t) => {
    let sla;
    try {
      sla = situacaoSLA({ criadaEm: t.criada_em, dias: SLA_DIAS_UTEIS, feriados: FERIADOS, agora });
    } catch (erro) {
      sla = { erro: erro.message };
    }
    return (
      <tr key={t.id}>
        <td style={SEM_QUEBRA}>{t.criada_em}</td><td>{t.titulo}</td><td>{t.status}</td>
        <td style={SEM_QUEBRA} title={sla.erro}>{sla.inicio ?? '—'}</td>
        <td style={SEM_QUEBRA} title={sla.erro}>{sla.final ?? '—'}</td>
        <td title={sla.erro}>
          {sla.erro ? '—'
            : t.status === 'concluida' ? <Farol tipo="concluida" />
            : sla.situacao === 'estourado'
              ? <Farol tipo="estourado" detalhe={`${sla.diasUteisDeAtraso === 1 ? '1 dia útil' : `${sla.diasUteisDeAtraso} dias úteis`} de atraso`} />
              : <Farol tipo={sla.situacao} percentual={sla.percentual} detalhe={`faltam ${tempoRestante(sla.horasRestantes)} úteis`} />}
        </td>
      </tr>
    );
  });
}
