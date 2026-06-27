// Demonstração HTTP do bloqueio transacional do FIX (Entrega 3).
//
// Dispara FIX concorrentes sobre a MESMA chave e sobre chaves DIFERENTES,
// medindo o início e o fim de cada requisição. Comprova pelo TEMPO que o
// servidor SERIALIZA o FIX da mesma chave (um espera o outro) e mantém chaves
// diferentes EM PARALELO — ou seja, a trava está ativa na rota do FIX.
//
// Pré-requisito: servidor no ar, de preferência com o atraso ligado para alargar
// a janela de bloqueio e tornar o efeito óbvio:
//   GLOSSARIO_DELAY_MS=1500 npm start
// Uso (em outro terminal):
//   npm run demo:fix

const BASE = process.env.GLOSSARIO_URL ?? "http://localhost:3000";

const inicioGlobal = Date.now();
const t = (): string => String(Date.now() - inicioGlobal).padStart(5, " ");

// Garante que a chave exista (ignora 409 se já existir).
async function garantir(chave: string, definicao: string): Promise<void> {
  await fetch(`${BASE}/termos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chave, definicao }),
  });
}

async function fix(rotulo: string, chave: string, definicao: string): Promise<void> {
  const ini = Date.now() - inicioGlobal;
  console.log(`[${t()}ms] → ${rotulo}: enviou FIX ${chave}`);
  const r = await fetch(`${BASE}/termos/${encodeURIComponent(chave)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definicao }),
  });
  const fim = Date.now() - inicioGlobal;
  console.log(`[${t()}ms] ← ${rotulo}: status ${r.status}  (durou ${fim - ini}ms)`);
}

async function main(): Promise<void> {
  console.log(`Demonstração do bloqueio do FIX em ${BASE}`);
  console.log("(dica: rode o servidor com GLOSSARIO_DELAY_MS=1500 para ver o efeito)\n");

  await garantir("TCP", "definição inicial");
  await garantir("UDP", "definição inicial");

  console.log("── MESMA chave (TCP): 3 FIX concorrentes → devem SERIALIZAR ──");
  await Promise.all([
    fix("A", "TCP", "retificação A"),
    fix("B", "TCP", "retificação B"),
    fix("C", "TCP", "retificação C"),
  ]);

  console.log("\n── Chaves DIFERENTES (TCP, UDP): 2 FIX concorrentes → em PARALELO ──");
  await Promise.all([
    fix("D", "TCP", "retificação D"),
    fix("E", "UDP", "retificação E"),
  ]);

  console.log("\nLeitura: na 1ª rodada os retornos saem ESPAÇADOS (um após o outro,");
  console.log("~o atraso entre cada), provando a serialização por chave do FIX.");
  console.log("Na 2ª rodada saem praticamente JUNTOS (chaves diferentes, em paralelo).");
}

main().catch((e: unknown) => {
  console.error("falha ao rodar a demo (o servidor está no ar?):", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

// Marca este arquivo como módulo ES (isola seu escopo do de outros scripts
// utilitários que também rodam em nível de topo, como src/carga.ts).
export {};
