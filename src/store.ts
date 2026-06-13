import { withKeyLock } from "./locks";

// Estado central em memória: termo (chave) -> definição.
// A unicidade do termo é garantida pela própria chave do Map.
const termos = new Map<string, string>();

export interface Termo {
  chave: string;
  definicao: string;
}

// Erros de domínio. O mapeamento para status HTTP fica na camada HTTP (app.ts),
// para o domínio não depender de detalhes de transporte.
export class TermoNaoEncontradoError extends Error {
  constructor(public readonly chave: string) {
    super(`termo não encontrado: ${chave}`);
    this.name = "TermoNaoEncontradoError";
  }
}

export class TermoJaExisteError extends Error {
  constructor(public readonly chave: string) {
    super(`termo já existe: ${chave}`);
    this.name = "TermoJaExisteError";
  }
}

// QUERY — leitura de um termo. Leitura é atômica no event loop, não usa lock.
export function query(chave: string): Termo {
  const definicao = termos.get(chave);
  if (definicao === undefined) throw new TermoNaoEncontradoError(chave);
  return { chave, definicao };
}

// LIST — leitura de todos os termos. Também sem lock.
export function list(): Termo[] {
  return [...termos].map(([chave, definicao]) => ({ chave, definicao }));
}

// ADD — cria um termo novo; falha se já existir (regra de unicidade).
// Serializado por chave: o "checa-e-escreve" roda sob o mutex daquela chave.
export function add(chave: string, definicao: string): Promise<Termo> {
  return withKeyLock(chave, () => {
    if (termos.has(chave)) throw new TermoJaExisteError(chave);
    termos.set(chave, definicao);
    return { chave, definicao };
  });
}

// FIX — atualiza um termo existente; falha se não existir.
// Serializado por chave pelo mesmo motivo do ADD.
export function fix(chave: string, definicao: string): Promise<Termo> {
  return withKeyLock(chave, () => {
    if (!termos.has(chave)) throw new TermoNaoEncontradoError(chave);
    termos.set(chave, definicao);
    return { chave, definicao };
  });
}
