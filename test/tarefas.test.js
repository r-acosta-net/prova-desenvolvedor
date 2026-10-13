import { describe, it, expect } from 'vitest';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { listarTarefas } from '../src/tarefas.js';

describe('listarTarefas', () => {
  it('lista as tarefas da Vértice Finanças em setembro', () => {
    const r = listarTarefas({ tarefas, empresas, empresaId: 3, de: '2026-09-01', ate: '2026-09-30' });
    expect(r.map((t) => t.id)).toEqual([105, 106]);
  });
});
