// O Excel em português usa ";" para separar colunas e, sem o BOM, lê o
// arquivo como Windows-1252 (acentos quebrados).
const BOM = '﻿';
const SEPARADOR = ';';
const QUEBRA = '\r\n';

/**
 * Um campo do CSV: sempre entre aspas, com as aspas internas duplicadas
 * (RFC 4180), assim ";", aspas e quebras de linha ficam dentro da coluna.
 * Campo que começa com = + - @, tab ou CR seria executado como fórmula pelo
 * Excel, mesmo entre aspas: ganha um apóstrofo na frente (OWASP CSV Injection).
 */
function campo(valor) {
  let texto = valor == null ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** 'AAAA-MM-DD' (com ou sem hora) → 'DD/MM/AAAA'. Pelo texto, sem Date, para não mudar de dia por causa do fuso. */
function dataBR(data) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data ?? '');
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : data;
}

/** Gera o CSV das tarefas para o financeiro abrir no Excel. */
export function gerarCSV(tarefas) {
  const linhas = tarefas.map((t) =>
    [t.id, t.titulo, t.status, dataBR(t.criada_em)].map(campo).join(SEPARADOR));
  return BOM + ['id;titulo;status;criada_em', ...linhas].join(QUEBRA) + QUEBRA;
}
