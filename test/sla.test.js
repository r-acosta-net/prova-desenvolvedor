// SLA restante (farol). O tempo é contado em dias úteis no horário de
// Brasília: cada dia útil vale 24 h e o prazo termina às 23:59 do dia final.
import { describe, it, expect } from 'vitest';
import { situacaoSLA } from '../src/sla.js';

const FERIADOS = ['2026-10-12', '2026-11-02', '2027-01-01'];
// Brasília é UTC−3: 10:00 em Brasília = 13:00Z
const emBrasilia = (dataHora) => new Date(`${dataHora}:00-03:00`);
// Tarefa 114: criada qui 08/10, 3 dias úteis → início sex 09/10, final qua 14/10
// (pula sáb 10, dom 11 e o feriado de seg 12). Total: 3 dias úteis = 72 h.
const sla = (agora, extra = {}) =>
  situacaoSLA({ criadaEm: '2026-10-08', dias: 3, feriados: FERIADOS, agora: emBrasilia(agora), ...extra });

describe('situacaoSLA: início e final', () => {
  it('início = primeiro dia útil depois da criação; final = prazoSLA', () => {
    expect(sla('2026-10-08 15:00')).toMatchObject({ inicio: '2026-10-09', final: '2026-10-14' });
  });

  it('criada na sexta: início na segunda', () => {
    const r = situacaoSLA({ criadaEm: '2026-10-02', dias: 3, feriados: FERIADOS, agora: emBrasilia('2026-10-02 10:00') });
    expect(r).toMatchObject({ inicio: '2026-10-05', final: '2026-10-07' });
  });
});

describe('situacaoSLA: percentual restante e farol', () => {
  const casos = [
    // [momento em Brasília, % restante, situação, horas úteis restantes]
    ['2026-10-08 15:00', 100, 'verde', 72], // dia da criação: o SLA ainda não começou
    ['2026-10-09 00:00', 100, 'verde', 72], // começo do primeiro dia útil
    ['2026-10-09 12:00', 83, 'verde', 60],
    ['2026-10-10 18:00', 66, 'verde', 48], // sábado: não consome SLA
    ['2026-10-12 10:00', 66, 'verde', 48], // feriado: não consome SLA
    ['2026-10-13 04:48', 60, 'verde', 43.2], // limite exato de 60%
    ['2026-10-13 04:49', 59, 'amarelo', 43.183],
    ['2026-10-13 12:00', 50, 'amarelo', 36],
    ['2026-10-14 09:36', 20, 'amarelo', 14.4], // limite exato de 20%
    ['2026-10-14 09:37', 19, 'vermelho', 14.383],
    ['2026-10-14 23:59', 0, 'vermelho', 0.017], // último minuto do prazo
  ];
  for (const [agora, percentual, situacao, horas] of casos) {
    it(`${agora} → ${percentual}% ${situacao}`, () => {
      const r = sla(agora);
      expect(r.percentual).toBe(percentual);
      expect(r.situacao).toBe(situacao);
      expect(r.horasRestantes).toBeCloseTo(horas, 2);
    });
  }
});

describe('situacaoSLA: prazo estourado', () => {
  it('meia-noite do dia seguinte ao final: estourado', () => {
    expect(sla('2026-10-15 00:00')).toMatchObject({ situacao: 'estourado', percentual: 0, horasRestantes: 0, diasUteisDeAtraso: 1 });
  });

  it('conta os dias úteis de atraso (qui 15 e sex 16)', () => {
    expect(sla('2026-10-16 10:00')).toMatchObject({ situacao: 'estourado', diasUteisDeAtraso: 2 });
  });

  it('fim de semana depois do prazo não aumenta o atraso', () => {
    expect(sla('2026-10-18 10:00')).toMatchObject({ situacao: 'estourado', diasUteisDeAtraso: 2 });
  });
});

describe('situacaoSLA: horário de Brasília, qualquer que seja o fuso da máquina', () => {
  it('02:59 UTC do dia 15 ainda é 23:59 do dia 14 em Brasília: não estourou', () => {
    const r = situacaoSLA({ criadaEm: '2026-10-08', dias: 3, feriados: FERIADOS, agora: new Date('2026-10-15T02:59:00Z') });
    expect(r.situacao).toBe('vermelho');
  });

  it('03:00 UTC do dia 15 já é meia-noite do dia 15 em Brasília: estourou', () => {
    const r = situacaoSLA({ criadaEm: '2026-10-08', dias: 3, feriados: FERIADOS, agora: new Date('2026-10-15T03:00:00Z') });
    expect(r.situacao).toBe('estourado');
  });
});

describe('situacaoSLA: casos de borda', () => {
  it('SLA que atravessa o ano (30/12 + 3, com feriado em 01/01)', () => {
    const r = situacaoSLA({ criadaEm: '2026-12-30', dias: 3, feriados: ['2026-12-25', ...FERIADOS], agora: emBrasilia('2027-01-02 10:00') });
    expect(r).toMatchObject({ inicio: '2026-12-31', final: '2027-01-05', percentual: 66, situacao: 'verde' });
  });

  it('0 dias: o prazo é o próprio dia da criação, e já começa em 0%', () => {
    const r = situacaoSLA({ criadaEm: '2026-10-08', dias: 0, feriados: FERIADOS, agora: emBrasilia('2026-10-08 10:00') });
    expect(r).toMatchObject({ inicio: '2026-10-08', final: '2026-10-08', percentual: 0, situacao: 'vermelho' });
    expect(situacaoSLA({ criadaEm: '2026-10-08', dias: 0, feriados: FERIADOS, agora: emBrasilia('2026-10-09 00:00') }).situacao)
      .toBe('estourado');
  });

  it('agora inválido é erro', () => {
    expect(() => situacaoSLA({ criadaEm: '2026-10-08', dias: 3, feriados: FERIADOS, agora: new Date('lixo') })).toThrow(/agora inválido/);
    expect(() => situacaoSLA({ criadaEm: '2026-10-08', dias: 3, feriados: FERIADOS, agora: '2026-10-08' })).toThrow(/agora inválido/);
  });

  it('erros do prazo (ex.: feriados do ano faltando) chegam a quem chamou', () => {
    expect(() => situacaoSLA({ criadaEm: '2026-12-30', dias: 3, feriados: ['2026-12-25'], agora: emBrasilia('2026-12-30 10:00') }))
      .toThrow(/Feriados de 2027 não carregados/);
  });
});
