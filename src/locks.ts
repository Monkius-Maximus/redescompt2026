// Mutex por chave — estratégia de bloqueio transacional.
//
// Por que existe: o Node executa JS num único event loop, então um trecho
// SÍNCRONO roda até o fim sem ser intercalado por outra requisição. A corrida
// só aparece quando a seção crítica cede o controle num `await` (ex.: persistir
// em disco/DB entre o "checa" e o "escreve"). Este utilitário serializa
// operações sobre a MESMA chave; chaves diferentes seguem em paralelo.
//
// Implementação: uma "corrente" de promises por chave. Cada nova operação é
// encadeada após a anterior. Quando a corrente de uma chave esvazia, a entrada
// é removida para o Map não crescer indefinidamente.

const correntes = new Map<string, Promise<void>>();

export function withKeyLock<T>(chave: string, fn: () => Promise<T> | T): Promise<T> {
  const anterior = correntes.get(chave) ?? Promise.resolve();

  // Roda `fn` depois da anterior terminar (mesmo que a anterior tenha falhado).
  const resultado = anterior.then(() => fn(), () => fn());

  // Elo que nunca rejeita, para não quebrar o encadeamento da próxima operação.
  const elo = resultado.then(
    () => undefined,
    () => undefined,
  );
  correntes.set(chave, elo);

  // Limpa a entrada quando este for o último elo da corrente.
  void elo.then(() => {
    if (correntes.get(chave) === elo) correntes.delete(chave);
  });

  // O chamador recebe o resultado real (que pode rejeitar com erro de domínio).
  return resultado;
}
