// Persistência local em disco (Entrega 3).
//
// O glossário passa a ser DURÁVEL: o estado sobrevive a reinícios do servidor.
// Guardamos o dicionário inteiro como um único arquivo JSON e o gravamos de
// forma ATÔMICA (escreve num arquivo temporário e depois faz `rename`), de modo
// que o arquivo final nunca fique pela metade — mesmo se o processo cair no meio
// de uma gravação.
//
// As gravações são SERIALIZADAS por uma corrente única (uma promise encadeada):
// cada salvamento espera o anterior e, ao efetivamente rodar, serializa o estado
// MAIS RECENTE do mapa em memória (a função `snapshot` é chamada na hora da
// gravação). Isso evita que duas gravações concorrentes — disparadas por FIX/ADD
// de chaves diferentes que rodam em paralelo — percam atualizações no disco.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./log";

// Raiz do projeto: este arquivo é .../src/persistencia.ts, então subir dois
// níveis chega na raiz, independentemente de onde o servidor foi iniciado.
const raizProjeto = dirname(dirname(fileURLToPath(import.meta.url)));

// Caminho do arquivo de dados. Trocável por variável de ambiente sem mexer no
// código (útil para testes ou para apontar um volume persistente).
const ARQUIVO = process.env.GLOSSARIO_DB ?? join(raizProjeto, "data", "glossario.json");

export function caminhoArquivo(): string {
  return ARQUIVO;
}

// Lê o arquivo no início. Se não existir, começa vazio. Se estiver corrompido,
// avisa nos logs e começa vazio (não derruba o servidor).
export async function carregar(): Promise<Map<string, string>> {
  try {
    const texto = await readFile(ARQUIVO, "utf8");
    const dados = JSON.parse(texto) as Record<string, string>;
    const mapa = new Map<string, string>(Object.entries(dados));
    log.info("persistencia.carregada", { arquivo: ARQUIVO, termos: mapa.size });
    return mapa;
  } catch (e: unknown) {
    const erro = e as NodeJS.ErrnoException;
    if (erro?.code === "ENOENT") {
      log.info("persistencia.vazia", { arquivo: ARQUIVO });
      return new Map();
    }
    log.erro("persistencia.falha_leitura", {
      arquivo: ARQUIVO,
      erro: erro?.message ?? String(e),
    });
    return new Map();
  }
}

// Corrente de gravações: serializa os salvamentos. `snapshot` é avaliada no
// momento da gravação para sempre persistir o estado mais novo.
let cadeia: Promise<void> = Promise.resolve();

export function salvar(snapshot: () => Map<string, string>): Promise<void> {
  cadeia = cadeia.then(
    () => escrever(snapshot()),
    () => escrever(snapshot()),
  );
  return cadeia;
}

async function escrever(mapa: Map<string, string>): Promise<void> {
  const obj = Object.fromEntries(mapa);
  const texto = JSON.stringify(obj, null, 2);
  await mkdir(dirname(ARQUIVO), { recursive: true });
  const temporario = `${ARQUIVO}.tmp`;
  await writeFile(temporario, texto, "utf8");
  await rename(temporario, ARQUIVO); // troca atômica no sistema de arquivos
}
