import { describe, it, expect } from 'vitest';
import tarefas from '../data/tarefas.json';
import { gerarCSV } from '../src/exportar.js';
import { lerCSV } from './support/lerCSV.js';

const tarefa = (titulo, extra = {}) => ({ id: 1, empresa_id: 2, titulo, status: 'aberta', criada_em: '2026-10-01', ...extra });
const linhasDe = (lista) => lerCSV(gerarCSV(lista));

describe('gerarCSV: formato que o Excel em português abre certo', () => {
  it('começa com o BOM UTF-8, para o Excel ler os acentos', () => {
    expect(gerarCSV(tarefas).charCodeAt(0)).toBe(0xfeff);
    const bytes = new TextEncoder().encode(gerarCSV(tarefas));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('primeira linha é exatamente id;titulo;status;criada_em', () => {
    expect(gerarCSV(tarefas).replace(/^﻿/, '').split('\r\n')[0]).toBe('id;titulo;status;criada_em');
  });

  it('separa as linhas com \\r\\n (padrão do CSV)', () => {
    const semBom = gerarCSV(tarefas).replace(/^﻿/, '');
    expect(semBom.split('\r\n').filter(Boolean)).toHaveLength(1 + tarefas.length);
    expect(semBom.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('lista vazia gera só o cabeçalho', () => {
    expect(linhasDe([])).toEqual([['id', 'titulo', 'status', 'criada_em']]);
  });

  it('todas as 15 tarefas reais saem com 4 colunas, na ordem e com os dados certos', () => {
    const [cabecalho, ...linhas] = linhasDe(tarefas);
    expect(cabecalho).toEqual(['id', 'titulo', 'status', 'criada_em']);
    expect(linhas).toHaveLength(15);
    for (const [i, l] of linhas.entries()) {
      expect(l).toHaveLength(4);
      expect(l[0]).toBe(String(tarefas[i].id));
      expect(l[2]).toBe(tarefas[i].status);
    }
  });

  it('não altera a lista recebida', () => {
    const copia = structuredClone(tarefas);
    gerarCSV(tarefas);
    expect(tarefas).toEqual(copia);
  });
});

describe('gerarCSV: data DD/MM/AAAA', () => {
  it('converte AAAA-MM-DD para DD/MM/AAAA sem passar por Date (não volta um dia em fuso negativo)', () => {
    const [, l] = linhasDe([tarefa('x', { criada_em: '2026-09-01' })]);
    expect(l[3]).toBe('01/09/2026');
  });

  it('se criada_em vier com hora, usa só o dia', () => {
    const [, l] = linhasDe([tarefa('x', { criada_em: '2026-09-30T23:59:59-03:00' })]);
    expect(l[3]).toBe('30/09/2026');
  });

  it('data fora do formato esperado sai como veio, sem quebrar o arquivo', () => {
    const linhas = linhasDe([tarefa('x', { criada_em: 'sem data' }), tarefa('y', { id: 2, criada_em: undefined })]);
    expect(linhas[1]).toEqual(['1', 'x', 'aberta', 'sem data']);
    expect(linhas[2]).toEqual(['2', 'y', 'aberta', '']);
  });

  it('datas das tarefas reais', () => {
    const [, ...linhas] = linhasDe(tarefas);
    expect(linhas.map((l) => l[3])).toEqual(
      tarefas.map((t) => `${t.criada_em.slice(8, 10)}/${t.criada_em.slice(5, 7)}/${t.criada_em.slice(0, 4)}`),
    );
  });
});

describe('gerarCSV: cada campo na sua coluna, seja qual for o título', () => {
  it('tarefa 112: aspas e ponto e vírgula no título', () => {
    const t = tarefas.find((x) => x.id === 112);
    const [, l] = linhasDe([t]);
    expect(l).toEqual(['112', 'Treinamento "Vendas 2026"; turma 1', 'aberta', '03/10/2026']);
  });

  it('tarefa 103: vírgula e travessão no título', () => {
    const t = tarefas.find((x) => x.id === 103);
    const [, l] = linhasDe([t]);
    expect(l).toEqual(['103', 'Visita técnica — Rua das Flores, 42', 'aberta', '10/09/2026']);
  });

  const TITULOS = [
    'simples',
    '',
    'ponto e vírgula; no meio',
    ';começa com ponto e vírgula',
    'termina com ponto e vírgula;',
    ';;;',
    'vírgula, no meio',
    'aspas "no meio"',
    '"entre aspas"',
    '"',
    '""',
    '"""',
    'aspas e separador: "a;b"; c',
    'quebra\nde linha',
    'quebra\r\nde linha Windows',
    'só CR\rno meio',
    '\n',
    'tab\tno meio',
    'acentos: ação, pão, çÇ, ü, ñ',
    'emoji 🚀 e ✓',
    'travessão — e reticências…',
    'barra invertida \\ e \\"',
    ' espaço no início e no fim ',
    'x'.repeat(5000),
  ];

  for (const titulo of TITULOS) {
    it(`título ${JSON.stringify(titulo.length > 40 ? `${titulo.slice(0, 20)}…(${titulo.length})` : titulo)}`, () => {
      const linhas = linhasDe([tarefa(titulo), tarefa('controle', { id: 2 })]);
      expect(linhas).toHaveLength(3);
      expect(linhas[1]).toEqual(['1', titulo, 'aberta', '01/10/2026']);
      expect(linhas[2]).toEqual(['2', 'controle', 'aberta', '01/10/2026']);
    });
  }
});

describe('gerarCSV: título não vira fórmula no Excel', () => {
  // OWASP CSV Injection: campo que começa com = + - @ tab ou CR ganha um
  // apóstrofo na frente; o Excel mostra como texto em vez de executar.
  const PERIGOSOS = [
    '=SOMA(despesas) conferir na auditoria',
    '=1+1',
    '+1+1',
    '-1+1',
    '@SUM(A1)',
    '\t=1+1',
    '\r=1+1',
    '=HYPERLINK("http://exemplo.invalido";"clique")',
  ];

  for (const titulo of PERIGOSOS) {
    it(`${JSON.stringify(titulo)} sai como texto, com apóstrofo na frente`, () => {
      const [, l] = linhasDe([tarefa(titulo)]);
      expect(l).toEqual(['1', `'${titulo}`, 'aberta', '01/10/2026']);
    });
  }

  it('tarefa 114 real', () => {
    const [, l] = linhasDe([tarefas.find((x) => x.id === 114)]);
    expect(l[1]).toBe("'=SOMA(despesas) conferir na auditoria");
  });

  it('também protege o status', () => {
    const [, l] = linhasDe([tarefa('x', { status: '=1+1' })]);
    expect(l[2]).toBe("'=1+1");
  });

  it('não mexe em = + - @ que não estão no começo', () => {
    const [, l] = linhasDe([tarefa('a = b + c - d @ e')]);
    expect(l[1]).toBe('a = b + c - d @ e');
  });
});
