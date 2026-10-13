import { describe, it, expect } from 'vitest';
import empresas from '../data/empresas.json';
import tarefas from '../data/tarefas.json';
import { listarTarefas } from '../src/tarefas.js';

const ids = (lista) => lista.map((t) => t.id);
// mesmo período que a tela abre por padrão (src/App.jsx)
const PERIODO_DA_TELA = { de: '2026-09-01', ate: '2026-10-31' };

describe('listarTarefas', () => {
  it('lista as tarefas da Vértice Finanças em setembro', () => {
    const r = listarTarefas({ tarefas, empresas, empresaId: 3, de: '2026-09-01', ate: '2026-09-30' });
    expect(r.map((t) => t.id)).toEqual([105, 106]);
  });

  describe('empresa escolhida + empresas abaixo dela', () => {
    it('Grupo Aurora vê todas as empresas do grupo, mas não a Outra Empresa', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 1, ...PERIODO_DA_TELA });
      expect(ids(r)).toEqual([101, 102, 103, 104, 105, 106, 108, 109, 110, 112, 113, 114, 115]);
    });

    it('Aurora Serviços vê a si mesma e a Aurora Campo, mas não a Vértice', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 2, ...PERIODO_DA_TELA });
      expect(new Set(r.map((t) => t.empresa_id))).toEqual(new Set([2, 4]));
      expect(ids(r)).toEqual([101, 102, 103, 104, 108, 109, 112, 113, 115]);
    });

    it('Aurora Campo vê só a si mesma (não sobe na árvore)', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 4, ...PERIODO_DA_TELA });
      expect(ids(r)).toEqual([103, 104, 109, 113]);
    });

    it('Outra Empresa S.A. vê só as próprias, e ninguém do grupo', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 5, ...PERIODO_DA_TELA });
      expect(ids(r)).toEqual([107, 111]);
    });

    it('empresa que não existe não vê nada', () => {
      expect(listarTarefas({ tarefas, empresas, empresaId: 99, ...PERIODO_DA_TELA })).toEqual([]);
    });

    it('árvore com ciclo não trava e não vaza para fora do ciclo', () => {
      const comCiclo = empresas.map((e) => (e.id === 2 ? { ...e, pai_id: 4 } : e));
      const r = listarTarefas({ tarefas, empresas: comCiclo, empresaId: 4, ...PERIODO_DA_TELA });
      expect(new Set(r.map((t) => t.empresa_id))).toEqual(new Set([2, 4]));
    });
  });

  describe('período inclui os dois dias das pontas', () => {
    it('tarefa criada no último dia do filtro aparece', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 2, de: '2026-09-01', ate: '2026-09-30' });
      expect(ids(r)).toContain(108); // criada em 2026-09-30
    });

    it('tarefa criada no primeiro dia do filtro aparece', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 2, de: '2026-09-01', ate: '2026-09-30' });
      expect(ids(r)).toContain(101); // criada em 2026-09-01
    });

    it('período de um dia só (de = até) traz as tarefas daquele dia', () => {
      const r = listarTarefas({ tarefas, empresas, empresaId: 1, de: '2026-10-01', ate: '2026-10-01' });
      expect(ids(r)).toEqual([109, 110]);
    });

    it('"de" depois do "até" não traz nada', () => {
      expect(listarTarefas({ tarefas, empresas, empresaId: 1, de: '2026-10-31', ate: '2026-09-01' })).toEqual([]);
    });

    it('campo de data limpo na tela ("") deixa aquele lado do período em aberto', () => {
      expect(ids(listarTarefas({ tarefas, empresas, empresaId: 5, de: '', ate: '2026-09-30' }))).toEqual([107]);
      expect(ids(listarTarefas({ tarefas, empresas, empresaId: 5, de: '2026-10-01', ate: '' }))).toEqual([111]);
    });
  });

  it('ordena pela data de criação e, no mesmo dia, pelo id', () => {
    const embaralhadas = [...tarefas].reverse();
    const r = listarTarefas({ tarefas: embaralhadas, empresas, empresaId: 1, ...PERIODO_DA_TELA });
    expect(ids(r)).toEqual([101, 102, 103, 104, 105, 106, 108, 109, 110, 112, 113, 114, 115]);
  });
});
