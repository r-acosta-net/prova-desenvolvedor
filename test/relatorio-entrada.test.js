// Entradas erradas no relatório: o dia informado tem de ser 'AAAA-MM-DD' e
// existir no calendário. Data inválida é erro, nunca um relatório zerado.
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vendas from '../data/vendas.json';
import { totalDoDia, ticketMedio } from '../src/relatorio.js';

const INVALIDAS = [
  // formato
  ['vazia', ''],
  ['só espaços', '   '],
  ['formato brasileiro', '01/10/2026'],
  ['barras no lugar de hífens', '2026/10/01'],
  ['pontos no lugar de hífens', '2026.10.01'],
  ['sem separador', '20261001'],
  ['mês com um dígito', '2026-1-01'],
  ['dia com um dígito', '2026-10-1'],
  ['ano com dois dígitos', '26-10-01'],
  ['ano com cinco dígitos', '02026-10-01'],
  ['ano com sinal', '+2026-10-01'],
  ['ordem dia-mês-ano', '01-10-2026'],
  ['com hora', '2026-10-01T00:00:00Z'],
  ['com hora sem fuso', '2026-10-01 10:00'],
  ['espaço antes', ' 2026-10-01'],
  ['espaço depois', '2026-10-01 '],
  ['quebra de linha no fim', '2026-10-01\n'],
  ['hífen unicode (‐)', '2026‐10‐01'],
  ['dígitos de largura total', '２０２６-10-01'],
  ['texto', 'ontem'],
  ['texto com aspas e ponto e vírgula', "2026-10-01'; drop table vendas"],
  // calendário
  ['mês 00', '2026-00-10'],
  ['mês 13', '2026-13-01'],
  ['dia 00', '2026-10-00'],
  ['dia 32', '2026-10-32'],
  ['31 de abril', '2026-04-31'],
  ['29/02 em ano comum', '2026-02-29'],
  ['29/02 em 1900 (divisível por 100, não bissexto)', '1900-02-29'],
  ['30/02', '2024-02-30'],
  ['ano 0000', '0000-01-01'],
];

const VALIDAS = [
  ['dia do relatório', '2026-10-01', 3400.5],
  ['29/02 em ano bissexto', '2024-02-29', 0],
  ['29/02 em 2000 (divisível por 400)', '2000-02-29', 0],
  ['último dia do ano', '2026-12-31', 0],
  ['primeiro dia do ano', '2026-01-01', 0],
];

const OUTROS_TIPOS = [
  ['undefined', undefined],
  ['null', null],
  ['número', 20261001],
  ['objeto Date', new Date('2026-10-01T12:00:00Z')],
  ['array', ['2026-10-01']],
  ['objeto', { dia: '2026-10-01' }],
];

describe('totalDoDia e ticketMedio recusam dia inválido (não devolvem 0)', () => {
  for (const [caso, dia] of [...INVALIDAS, ...OUTROS_TIPOS]) {
    it(`${caso}: ${JSON.stringify(dia)}`, () => {
      expect(() => totalDoDia(vendas, dia)).toThrow(/Data inválida/);
      expect(() => ticketMedio(vendas, dia)).toThrow(/Data inválida/);
    });
  }
});

describe('totalDoDia aceita qualquer dia válido do calendário', () => {
  for (const [caso, dia, esperado] of VALIDAS) {
    it(`${caso}: ${dia}`, () => {
      expect(totalDoDia(vendas, dia)).toBe(esperado);
      expect(() => ticketMedio(vendas, dia)).not.toThrow();
    });
  }
});

describe('npm run relatorio', () => {
  const script = fileURLToPath(new URL('../scripts/relatorio.js', import.meta.url));
  const rodar = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('dia válido: imprime o relatório e termina com sucesso (código 0)', () => {
    const r = rodar('2026-10-01');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Total vendido: R\$\s3\.400,50/);
    expect(r.stderr).toBe('');
  });

  it('sem dia: explica o uso e termina com erro (código 1)', () => {
    const r = rodar();
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/npm run relatorio -- 2026-10-01/);
    expect(r.stdout).toBe('');
  });

  for (const [caso, dia] of INVALIDAS) {
    it(`${caso}: ${JSON.stringify(dia)} → mensagem clara, código 1, sem relatório`, () => {
      const r = rodar(dia);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/Data inválida/);
      expect(r.stdout).not.toMatch(/Total vendido/);
    });
  }

  it('mais de um dia: recusa em vez de ignorar o segundo', () => {
    const r = rodar('2026-10-01', '2026-10-02');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/um único dia/);
    expect(r.stdout).not.toMatch(/Total vendido/);
  });
});
