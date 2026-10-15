// Uso: npm run relatorio -- 2026-10-01
import { readFileSync } from 'node:fs';
import { totalDoDia, ticketMedio, formatarBRL, validarDia } from '../src/relatorio.js';

const dias = process.argv.slice(2);
if (dias.length === 0) {
  console.error('Informe o dia: npm run relatorio -- 2026-10-01');
  process.exit(1);
}
if (dias.length > 1) {
  console.error(`Informe um único dia (recebi ${dias.length}: ${dias.join(' ')}). Ex.: npm run relatorio -- 2026-10-01`);
  process.exit(1);
}

const [dia] = dias;
try {
  validarDia(dia);
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

const vendas = JSON.parse(readFileSync(new URL('../data/vendas.json', import.meta.url)));

console.log(`Relatório de vendas — ${dia}`);
console.log(`Total vendido: ${formatarBRL(totalDoDia(vendas, dia))}`);
console.log(`Ticket médio:  ${formatarBRL(ticketMedio(vendas, dia))}`);
