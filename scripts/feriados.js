// Baixa os feriados nacionais de um ano da BrasilAPI e salva em
// data/feriados-<ano>.json.
//
// Uso:  npm run feriados -- 2026
//
// Variáveis opcionais (usadas nos testes): FERIADOS_API_URL (endereço base da
// API), FERIADOS_DIR (pasta de destino), FERIADOS_TIMEOUT_MS (tempo limite).
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizarFeriados } from '../src/feriados.js';

const API = process.env.FERIADOS_API_URL ?? 'https://brasilapi.com.br/api/feriados/v1';
const PASTA = process.env.FERIADOS_DIR ?? fileURLToPath(new URL('../data', import.meta.url));
const TEMPO_LIMITE_MS = Number(process.env.FERIADOS_TIMEOUT_MS ?? 15000);

const args = process.argv.slice(2);
const ano = Number(args[0]);
// a BrasilAPI calcula feriados de 1900 a 2199
if (args.length !== 1 || !/^\d{4}$/.test(args[0]) || ano < 1900 || ano > 2199) {
  console.error(`Informe um único ano entre 1900 e 2199 (recebi: ${args.join(' ') || 'nada'}). Ex.: npm run feriados -- 2026`);
  process.exit(1);
}

const destino = join(PASTA, `feriados-${ano}.json`);
const fonte = `${API}/${ano}`;

async function baixar() {
  let resposta;
  try {
    resposta = await fetch(fonte, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  } catch (erro) {
    if (erro.name === 'TimeoutError') throw new Error(`a API não respondeu em ${TEMPO_LIMITE_MS} ms (${fonte})`);
    throw new Error(`sem conexão com ${fonte} (${erro.cause?.code ?? erro.message})`);
  }
  const texto = await resposta.text();
  if (!resposta.ok) {
    let detalhe = '';
    try { detalhe = JSON.parse(texto).message ?? ''; } catch { /* corpo não é JSON */ }
    throw new Error(`a API respondeu HTTP ${resposta.status}${detalhe ? `: ${detalhe}` : ''}`);
  }
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`a resposta da API não é JSON (${resposta.headers.get('content-type') ?? 'sem tipo'})`);
  }
}

try {
  const feriados = normalizarFeriados(await baixar(), ano);
  // grava num temporário e só então substitui: uma falha no meio não deixa
  // o arquivo pela metade
  const temporario = `${destino}.tmp`;
  try {
    writeFileSync(temporario, `${JSON.stringify({ ano, fonte, feriados }, null, 2)}\n`, 'utf8');
    renameSync(temporario, destino);
  } finally {
    rmSync(temporario, { force: true });
  }
  console.log(`${feriados.length} feriados nacionais de ${ano} salvos em ${relative(process.cwd(), destino)} (fonte: ${fonte})`);
} catch (erro) {
  console.error(`Não foi possível baixar os feriados de ${ano}: ${erro.message}`);
  if (existsSync(destino)) console.error(`O arquivo existente não foi alterado: ${relative(process.cwd(), destino)}`);
  process.exit(1);
}
