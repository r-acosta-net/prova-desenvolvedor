// `npm run feriados -- <ano>`: baixa da BrasilAPI e grava data/feriados-<ano>.json.
// Os testes não usam a internet: um servidor local imita a API.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarFeriados } from '../src/feriados.js';

const API_2026 = [
  { date: '2026-04-21', name: 'Tiradentes', type: 'national', weekday: 'terça-feira' },
  { date: '2026-01-01', name: 'Confraternização mundial', type: 'national', weekday: 'quinta-feira' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'national', weekday: 'segunda-feira' },
];

describe('normalizarFeriados', () => {
  it('ordena por data e guarda data, nome e tipo', () => {
    expect(normalizarFeriados(API_2026, 2026)).toEqual([
      { date: '2026-01-01', name: 'Confraternização mundial', type: 'national' },
      { date: '2026-04-21', name: 'Tiradentes', type: 'national' },
      { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
    ]);
  });

  it('data repetida aparece uma vez só', () => {
    expect(normalizarFeriados([...API_2026, API_2026[0]], 2026)).toHaveLength(3);
  });

  it('fica só com feriados nacionais', () => {
    const r = normalizarFeriados([...API_2026, { date: '2026-07-09', name: 'Revolução Constitucionalista', type: 'state' }], 2026);
    expect(r.map((f) => f.date)).not.toContain('2026-07-09');
  });

  const INVALIDAS = [
    ['não é lista', { feriados: API_2026 }],
    ['lista vazia', []],
    ['item sem data', [{ name: 'x', type: 'national' }]],
    ['data em outro formato', [{ date: '21/04/2026', name: 'Tiradentes', type: 'national' }]],
    ['data que não existe', [{ date: '2026-02-30', name: 'x', type: 'national' }]],
    ['data de outro ano', [{ date: '2025-12-25', name: 'Natal', type: 'national' }]],
    ['item sem nome', [{ date: '2026-12-25', type: 'national' }]],
    ['nenhum nacional', [{ date: '2026-07-09', name: 'x', type: 'state' }]],
  ];
  for (const [caso, resposta] of INVALIDAS) {
    it(`recusa resposta inválida: ${caso}`, () => {
      expect(() => normalizarFeriados(resposta, 2026)).toThrow(/Resposta inesperada da API/);
    });
  }
});

describe('npm run feriados (com uma API falsa local)', () => {
  const script = fileURLToPath(new URL('../scripts/feriados.js', import.meta.url));
  let servidor;
  let base;
  let pasta;

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      const [, rota, ano] = req.url.split('/');
      const json = (status, corpo) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(corpo)); };
      if (rota === 'ok') return json(200, API_2026.map((f) => ({ ...f, date: f.date.replace('2026', ano) })));
      if (rota === '404') return json(404, { message: 'Ano fora do intervalo suportado entre 1900 e 2199.', type: 'feriados_range_error' });
      if (rota === '500') { res.writeHead(500); return res.end('erro interno'); }
      if (rota === 'html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<html>manutenção</html>'); }
      if (rota === 'vazio') return json(200, []);
      if (rota === 'outro-ano') return json(200, [{ date: '1999-01-01', name: 'x', type: 'national' }]);
      if (rota === 'lento') return; // nunca responde
      return json(404, {});
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    base = `http://127.0.0.1:${servidor.address().port}`;
  });

  afterAll(() => {
    servidor.closeAllConnections();
    servidor.close();
  });

  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'feriados-'));
    return () => rmSync(pasta, { recursive: true, force: true });
  });

  const rodar = (args, rota = 'ok', extra = {}) => new Promise((ok) => {
    const p = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, FERIADOS_API_URL: `${base}/${rota}`, FERIADOS_DIR: pasta, FERIADOS_TIMEOUT_MS: '500', ...extra },
    });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('close', (status) => ok({ status, stdout, stderr }));
  });

  it('baixa, grava data/feriados-<ano>.json e informa quantos salvou', async () => {
    const r = await rodar(['2026']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/3 feriados nacionais de 2026 salvos em .*feriados-2026\.json/);
    const arquivo = JSON.parse(readFileSync(join(pasta, 'feriados-2026.json'), 'utf8'));
    expect(arquivo).toEqual({
      ano: 2026,
      fonte: `${base}/ok/2026`,
      feriados: [
        { date: '2026-01-01', name: 'Confraternização mundial', type: 'national' },
        { date: '2026-04-21', name: 'Tiradentes', type: 'national' },
        { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
      ],
    });
  });

  it('rodar de novo gera exatamente o mesmo arquivo (sem data/hora do download)', async () => {
    await rodar(['2026']);
    const primeiro = readFileSync(join(pasta, 'feriados-2026.json'), 'utf8');
    await rodar(['2026']);
    expect(readFileSync(join(pasta, 'feriados-2026.json'), 'utf8')).toBe(primeiro);
  });

  const ANOS_INVALIDOS = [[], ['abc'], ['26'], ['20266'], ['1899'], ['2200'], ['2026', '2027'], [' 2026'], ['2026.0']];
  for (const args of ANOS_INVALIDOS) {
    it(`ano inválido ${JSON.stringify(args)}: explica o uso, código 1, nada gravado`, async () => {
      const r = await rodar(args);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/npm run feriados -- 2026/);
      expect(readdirSync(pasta)).toEqual([]);
    });
  }

  const FALHAS = [
    ['API responde 404', '404', /HTTP 404.*Ano fora do intervalo/],
    ['API responde 500', '500', /HTTP 500/],
    ['API responde HTML', 'html', /não é JSON/],
    ['API devolve lista vazia', 'vazio', /Resposta inesperada da API/],
    ['API devolve feriados de outro ano', 'outro-ano', /Resposta inesperada da API/],
    ['API não responde a tempo', 'lento', /não respondeu em 500 ms/],
  ];
  for (const [caso, rota, mensagem] of FALHAS) {
    it(`${caso}: mensagem clara, código 1 e o arquivo existente fica intacto`, async () => {
      writeFileSync(join(pasta, 'feriados-2026.json'), 'ORIGINAL');
      const r = await rodar(['2026'], rota);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(mensagem);
      expect(r.stderr).toMatch(/arquivo existente não foi alterado/);
      expect(readFileSync(join(pasta, 'feriados-2026.json'), 'utf8')).toBe('ORIGINAL');
      expect(readdirSync(pasta)).toEqual(['feriados-2026.json']); // nenhum arquivo temporário sobrando
    });
  }

  it('API fora do ar: mensagem clara, código 1, nada gravado', async () => {
    const r = await rodar(['2026'], 'ok', { FERIADOS_API_URL: 'http://127.0.0.1:9/ok' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Não foi possível baixar os feriados de 2026/);
    expect(existsSync(join(pasta, 'feriados-2026.json'))).toBe(false);
  });
});

describe('arquivos versionados em data/', () => {
  for (const ano of [2026, 2027]) {
    it(`data/feriados-${ano}.json é válido e veio da BrasilAPI`, () => {
      const arquivo = JSON.parse(readFileSync(new URL(`../data/feriados-${ano}.json`, import.meta.url), 'utf8'));
      expect(arquivo.ano).toBe(ano);
      expect(arquivo.fonte).toBe(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
      expect(normalizarFeriados(arquivo.feriados, ano)).toEqual(arquivo.feriados);
      expect(arquivo.feriados.map((f) => f.date)).toEqual(expect.arrayContaining([`${ano}-01-01`, `${ano}-10-12`, `${ano}-11-20`, `${ano}-12-25`]));
    });
  }
});
