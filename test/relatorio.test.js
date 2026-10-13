import { describe, it, expect } from 'vitest';
import { totalDoDia } from '../src/relatorio.js';

describe('totalDoDia', () => {
  it('soma só as vendas pagas', () => {
    const vendas = [
      { id: 'A', valor: 100, status: 'paga', criada_em: '2026-10-05T15:00:00Z' },
      { id: 'B', valor: 50, status: 'cancelada', criada_em: '2026-10-05T16:00:00Z' },
    ];
    expect(totalDoDia(vendas, '2026-10-05')).toBe(100);
  });
});
