import { describe, it, expect } from 'vitest';
import tarefas from '../data/tarefas.json';
import { prazoSLA } from '../src/prazo.js';

// Feriados nacionais da BrasilAPI (os mesmos de data/feriados-2026.json e -2027.json)
const F2026 = ['2026-01-01', '2026-02-16', '2026-02-17', '2026-04-03', '2026-04-05', '2026-04-21', '2026-05-01',
  '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25'];
const F2027 = ['2027-01-01', '2027-02-08', '2027-02-09', '2027-03-26', '2027-03-28', '2027-04-21', '2027-05-01',
  '2027-05-27', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25'];
const FERIADOS = [...F2026, ...F2027];

describe('prazoSLA: dias úteis a partir do dia seguinte à criação', () => {
  it('sexta + 1 dia vence na segunda, não no sábado (reclamação do cliente)', () => {
    expect(prazoSLA('2026-10-02', 1, FERIADOS)).toBe('2026-10-05');
  });

  it('sábado + 1 dia: segunda 12/10 é feriado, vence na terça', () => {
    expect(prazoSLA('2026-10-10', 1, FERIADOS)).toBe('2026-10-13');
  });

  it('domingo + 1 dia vence na segunda', () => {
    expect(prazoSLA('2026-09-20', 1, FERIADOS)).toBe('2026-09-21');
  });

  it('quinta + 3 dias pula o fim de semana e o feriado de 12/10', () => {
    expect(prazoSLA('2026-10-08', 3, FERIADOS)).toBe('2026-10-14');
  });

  it('pula Finados (02/11) e a Consciência Negra (20/11)', () => {
    expect(prazoSLA('2026-10-30', 3, FERIADOS)).toBe('2026-11-05');
    expect(prazoSLA('2026-11-19', 1, FERIADOS)).toBe('2026-11-23');
  });

  it('criada num feriado conta a partir do dia útil seguinte', () => {
    expect(prazoSLA('2026-10-12', 1, FERIADOS)).toBe('2026-10-13');
  });

  it('segue a BrasilAPI: Carnaval e Corpus Christi não contam', () => {
    expect(prazoSLA('2026-02-13', 1, FERIADOS)).toBe('2026-02-18');
    expect(prazoSLA('2026-06-03', 1, FERIADOS)).toBe('2026-06-05');
  });

  it('feriado no fim de semana não muda nada', () => {
    expect(prazoSLA('2026-11-13', 1, FERIADOS)).toBe('2026-11-16'); // 15/11 é domingo
  });

  it('atravessa o ano usando os feriados do ano seguinte', () => {
    expect(prazoSLA('2026-12-30', 3, FERIADOS)).toBe('2027-01-05');
  });

  it('0 dias: o prazo é a própria data de criação', () => {
    expect(prazoSLA('2026-10-10', 0, FERIADOS)).toBe('2026-10-10');
  });

  it('SLA longo (20 dias úteis) atravessando vários feriados', () => {
    // 01/10 → out: 02,05,06,07,08,09,13,14,15,16,19,20,21,22,23,26,27,28,29,30 (pula 12/10)
    expect(prazoSLA('2026-10-01', 20, FERIADOS)).toBe('2026-10-30');
  });

  it('sem feriados informados conta só segunda a sexta', () => {
    expect(prazoSLA('2026-10-08', 3)).toBe('2026-10-13');
    expect(prazoSLA('2026-10-08', 3, [])).toBe('2026-10-13');
  });

  it('não altera a lista de feriados recebida', () => {
    const lista = [...F2026];
    prazoSLA('2026-10-08', 3, lista);
    expect(lista).toEqual(F2026);
  });

  it('prazo de 3 dias úteis das tarefas reais', () => {
    const esperado = {
      101: '2026-09-04', 102: '2026-09-10', 103: '2026-09-15', 104: '2026-09-18', 105: '2026-09-18',
      106: '2026-09-23', 107: '2026-09-23', 108: '2026-10-05', 109: '2026-10-06', 110: '2026-10-06',
      111: '2026-10-07', 112: '2026-10-07', 113: '2026-10-08', 114: '2026-10-14', 115: '2026-10-15',
    };
    expect(Object.fromEntries(tarefas.map((t) => [t.id, prazoSLA(t.criada_em, 3, FERIADOS)]))).toEqual(esperado);
  });

  it('não depende do fuso nem do horário de verão (02/11/2018, véspera do horário de verão em SP)', () => {
    // sex 02/11 → seg 05, ter 06, qua 07. O código antigo perdia um dia em America/Sao_Paulo.
    expect(prazoSLA('2018-11-02', 3, [])).toBe('2018-11-07');
  });
});

describe('prazoSLA: feriados do ano precisam estar carregados', () => {
  it('erro se a contagem entra num ano sem feriados na lista', () => {
    expect(() => prazoSLA('2026-12-30', 3, F2026)).toThrow(/Feriados de 2027 não carregados/);
  });

  it('não reclama quando o prazo fica dentro do ano carregado', () => {
    expect(prazoSLA('2026-12-21', 3, F2026)).toBe('2026-12-24');
  });
});

describe('prazoSLA: entradas inválidas dão erro em vez de prazo errado', () => {
  const DATAS_INVALIDAS = ['', '02/10/2026', '2026-10-2', '2026-02-30', '2026-13-01', '2026-10-02T10:00', 'lixo', null, undefined, 20261002];
  for (const criadaEm of DATAS_INVALIDAS) {
    it(`criadaEm ${JSON.stringify(criadaEm)}`, () => {
      expect(() => prazoSLA(criadaEm, 3, FERIADOS)).toThrow(/criadaEm inválida/);
    });
  }

  const DIAS_INVALIDOS = [-1, 1.5, NaN, Infinity, '3', null, undefined];
  for (const dias of DIAS_INVALIDOS) {
    it(`dias ${String(dias)} (${typeof dias})`, () => {
      expect(() => prazoSLA('2026-10-02', dias, FERIADOS)).toThrow(/dias inválido/);
    });
  }

  it('feriados que não é lista', () => {
    expect(() => prazoSLA('2026-10-02', 1, '2026-10-12')).toThrow(/feriados inválidos/);
  });

  it('feriado com data inválida', () => {
    expect(() => prazoSLA('2026-10-02', 1, ['2026-10-12', '12/10/2026'])).toThrow(/feriados inválidos/);
  });
});
