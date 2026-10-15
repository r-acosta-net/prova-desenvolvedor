import { describe, it, expect } from 'vitest';
import vendasDoArquivo from '../data/vendas.json';
import { totalDoDia, ticketMedio, formatarBRL } from '../src/relatorio.js';

const venda = (id, valor, criada_em, status = 'paga') => ({ id, valor, status, criada_em });

describe('totalDoDia', () => {
  it('soma só as vendas pagas', () => {
    const vendas = [
      { id: 'A', valor: 100, status: 'paga', criada_em: '2026-10-05T15:00:00Z' },
      { id: 'B', valor: 50, status: 'cancelada', criada_em: '2026-10-05T16:00:00Z' },
    ];
    expect(totalDoDia(vendas, '2026-10-05')).toBe(100);
  });

  it('01/10/2026 com os dados reais dá R$ 3.400,50 (conferido pelo financeiro)', () => {
    expect(totalDoDia(vendasDoArquivo, '2026-10-01')).toBe(3400.5);
    expect(formatarBRL(totalDoDia(vendasDoArquivo, '2026-10-01'))).toBe(formatarBRL(3400.5));
  });

  describe('o dia é o de Brasília (UTC−3)', () => {
    it('venda às 23h de Brasília entra no dia, mesmo já sendo o dia seguinte em UTC', () => {
      const vendas = [venda('A', 100, '2026-10-02T02:59:59Z')]; // 01/10 23:59:59 em Brasília
      expect(totalDoDia(vendas, '2026-10-01')).toBe(100);
      expect(totalDoDia(vendas, '2026-10-02')).toBe(0);
    });

    it('venda à meia-noite de Brasília já é do dia seguinte', () => {
      const vendas = [venda('A', 100, '2026-10-02T03:00:00Z')]; // 02/10 00:00 em Brasília
      expect(totalDoDia(vendas, '2026-10-01')).toBe(0);
      expect(totalDoDia(vendas, '2026-10-02')).toBe(100);
    });

    it('venda de madrugada em UTC é da véspera em Brasília', () => {
      const vendas = [venda('A', 600, '2026-10-01T02:00:00Z')]; // 30/09 23:00 em Brasília
      expect(totalDoDia(vendas, '2026-09-30')).toBe(600);
      expect(totalDoDia(vendas, '2026-10-01')).toBe(0);
    });
  });

  describe('venda repetida pela sincronização conta uma vez só', () => {
    it('mesmo id duas vezes soma uma vez', () => {
      const vendas = [venda('A', 250.5, '2026-10-01T15:30:00Z'), venda('A', 250.5, '2026-10-01T15:30:00Z')];
      expect(totalDoDia(vendas, '2026-10-01')).toBe(250.5);
    });
  });

  it('soma em centavos, sem erro de ponto flutuante', () => {
    const vendas = [venda('A', 0.1, '2026-10-01T15:00:00Z'), venda('B', 0.2, '2026-10-01T16:00:00Z')];
    expect(totalDoDia(vendas, '2026-10-01')).toBe(0.3);
  });

  it('somando todos os dias, nenhuma venda paga se perde nem é contada duas vezes', () => {
    const dias = ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
    const porDia = Object.fromEntries(dias.map((d) => [d, totalDoDia(vendasDoArquivo, d)]));
    expect(porDia).toEqual({ '2026-09-30': 1370, '2026-10-01': 3400.5, '2026-10-02': 3340, '2026-10-03': 510 });

    const unicasPagas = new Map(vendasDoArquivo.filter((v) => v.status === 'paga').map((v) => [v.id, v.valor]));
    const totalUnico = [...unicasPagas.values()].reduce((a, b) => a + b, 0);
    expect(Object.values(porDia).reduce((a, b) => a + b, 0)).toBeCloseTo(totalUnico, 2);
  });
});

describe('ticketMedio', () => {
  it('01/10/2026 com os dados reais: R$ 3.400,50 ÷ 5 vendas pagas = R$ 680,10', () => {
    expect(ticketMedio(vendasDoArquivo, '2026-10-01')).toBe(680.1);
  });

  it('não conta venda cancelada nem venda repetida no número de vendas', () => {
    const vendas = [
      venda('A', 100, '2026-10-01T15:00:00Z'),
      venda('A', 100, '2026-10-01T15:00:00Z'),
      venda('B', 300, '2026-10-01T16:00:00Z'),
      venda('C', 999, '2026-10-01T17:00:00Z', 'cancelada'),
    ];
    expect(ticketMedio(vendas, '2026-10-01')).toBe(200);
  });

  it('dia sem vendas pagas dá zero', () => {
    expect(ticketMedio([venda('C', 50, '2026-10-01T17:00:00Z', 'cancelada')], '2026-10-01')).toBe(0);
    expect(ticketMedio([], '2026-10-01')).toBe(0);
  });
});
