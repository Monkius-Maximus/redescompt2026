# Glossário Técnico Compartilhado

Projeto da disciplina de **Sistemas Distribuídos** (UFPE) — **Equipe 10**.
Este repositório corresponde à **Entrega 1 (Arquitetura e Escopo)**.

Servidor HTTP REST que mantém um **glossário de termos técnicos** (pares
`chave → definição`) em memória, atendendo a múltiplos clientes simultâneos por
meio das operações **QUERY**, **ADD**, **FIX** e **LIST**. É a reimplementação,
agora sobre um framework web, do mesmo sistema feito anteriormente com sockets.

## Tecnologias escolhidas e justificativa

| Tecnologia | Papel | Por que |
|---|---|---|
| **Node.js + Express 5** | servidor HTTP / roteamento REST | Framework sugerido no enunciado; mapeia QUERY/ADD/FIX diretamente em GET/POST/PUT. O Express 5 encaminha erros de *handlers* `async` ao tratador de erros nativamente, o que mantém os handlers limpos. |
| **TypeScript** | tipagem estática | O compilador pega erros antes da execução, reduzindo checagem manual em runtime. |
| **Zod** | validação de formato | Valida o corpo das requisições e **infere o tipo a partir do mesmo schema** — uma fonte de verdade só para formato e tipo. |
| **tsx** | execução | Roda os arquivos `.ts` diretamente, sem etapa de *build*. |

A arquitetura é um **único servidor com estado central em memória**. A
concorrência entre requisições é tratada com **bloqueio por chave** (ver
[Estratégia de locking](#estratégia-de-locking-bloqueio-transacional)).

## Estrutura de pastas

```
glossario-tecnico/
├── package.json          # dependências e scripts (dev / start / cliente / demo / typecheck)
├── tsconfig.json         # TypeScript (ESM, strict, sem build)
├── README.md
├── public/
│   └── index.html        # interface web (página de apresentação + formulários; consome a API via fetch)
└── src/
    ├── index.ts              # ponto de entrada: sobe o servidor na porta fixa
    ├── app.ts                # camada HTTP: middlewares, rotas, mapeia erro → status
    ├── store.ts              # estado em memória (Map) + operações de domínio
    ├── locks.ts              # mutex por chave (estratégia de bloqueio)
    ├── schemas.ts            # schemas Zod + tipos inferidos
    ├── cliente.ts            # cliente de linha de comando interativo (consome a API)
    └── demo-concorrencia.ts  # demonstração executável do mutex por chave
```

Cada arquivo tem uma responsabilidade única: `schemas` não conhece Express,
`store` não conhece HTTP, `locks` não conhece o domínio, e o mapeamento
HTTP↔domínio fica concentrado em `app.ts`.

## Estrutura de dados em memória

O estado central é um único dicionário (`Map`) em `store.ts`:

```ts
const termos = new Map<string, string>();   // chave (termo) -> definição
```

- A **unicidade da chave** é garantida pela própria estrutura do `Map`.
- A regra de negócio de unicidade é aplicada no **ADD** (falha se a chave já
  existe) e a de existência no **FIX** (falha se a chave não existe).

O utilitário de bloqueio mantém uma estrutura auxiliar em `locks.ts`:

```ts
const correntes = new Map<string, Promise<void>>();  // uma "corrente" por chave
```

## Endpoints planejados

| Comando | Método e rota | Corpo (JSON) | Sucesso | Erros |
|---|---|---|---|---|
| **QUERY** | `GET /termos/:chave` | — | `200` `{ chave, definicao }` | `404` |
| **LIST** | `GET /termos` | — | `200` `[{ chave, definicao }]` | — |
| **ADD** | `POST /termos` | `{ chave, definicao }` | `201` `{ chave, definicao }` | `409`, `422` |
| **FIX** | `PUT /termos/:chave` | `{ definicao }` | `200` `{ chave, definicao }` | `404`, `422` |
| (teste) | `GET /health` | — | `200` `{ status: "ok" }` | — |
| (web) | `GET /` | — | `200` página HTML (interface) | — |
| (índice) | `GET /api` | — | `200` `{ servico, endpoints }` | — |

Semântica dos comandos: **ADD só cria** (`409 Conflict` se o termo já existe) e
**FIX só atualiza** (`404 Not Found` se o termo não existe). Essa separação torna
a regra de unicidade visível no comportamento.

Códigos de status usados: `200` OK, `201` Created, `404` Not Found,
`409` Conflict, `422` Unprocessable Entity (falha de validação) e `500` para
erros inesperados. O corpo de erro tem o formato `{ "erro": "..." }`; o de
validação inclui também `detalhes` com os problemas reportados pelo Zod.

## Estratégia de locking (bloqueio transacional)

O requisito é garantir que a modificação de um termo **não seja sobreposta** por
outra requisição concorrente **sobre o mesmo termo**. A solução leva em conta o
modelo de execução do Node:

- O Node executa JavaScript em um **único *event loop***. Um trecho **síncrono**
  roda até o fim sem ser intercalado por outra requisição. Logo, um ADD/FIX que
  faça apenas operações síncronas em memória (`has` seguido de `set`) **já é
  atômico** — não há corrida entre a checagem e a escrita.
- A corrida só aparece quando a seção crítica **cede o controle num `await`**
  (por exemplo, ao persistir em disco/banco ou chamar outro serviço entre o
  "checa" e o "escreve"). É aí que duas requisições sobre a **mesma** chave podem
  se intercalar.

Por isso a estratégia é um **mutex por chave** (`src/locks.ts`): cada chave tem
uma "corrente" de promises; operações sobre a mesma chave são encadeadas e
executam **uma de cada vez**, enquanto chaves diferentes seguem **em paralelo**.
ADD e FIX rodam sob esse mutex; **QUERY e LIST são leitura pura e não usam lock**.

Para a Entrega 1, como o estado é só em memória, o mutex é **preparatório**:
preserva a serialização por termo no momento em que uma etapa assíncrona
(ex.: persistência) for introduzida na seção crítica. Mantê-lo agora atende ao
"lock por chave individual" exigido e deixa explícito *quando* e *por que* o
bloqueio importa neste runtime — diferente de uma linguagem com *threads*, onde
o lock seria necessário já no caso puramente síncrono.

## Validações

Feitas com Zod, antes do handler. Em falha, a resposta é `422` com a lista de
problemas.

- `chave`: texto não-vazio, com *trim*, no máximo 200 caracteres.
- `definicao`: texto não-vazio, com *trim*, no máximo 2000 caracteres.

Os espaços nas pontas são removidos (*trim*) antes de armazenar, então
`"  TCP  "` e `"TCP"` referem-se ao mesmo termo. As regras de negócio do domínio
(unicidade no ADD, existência no FIX) são verificadas no `store`.

## Como rodar

Requisitos: Node.js 18+ (testado no Node 22).

```bash
npm install        # instala dependências
npm run dev        # sobe com auto-reload (tsx watch)
# ou
npm start          # sobe sem watch
npm run cliente    # cliente interativo (precisa do servidor rodando)
npm run demo       # demonstração do mutex por chave (não precisa do servidor)
npm run typecheck  # checagem de tipos (tsc --noEmit)
```

O servidor sobe em `http://localhost:3000` — **abra esse endereço no navegador
para usar a interface web** (buscar, listar, adicionar e editar termos).

## Interface web

Ao abrir `http://localhost:3000`, o servidor entrega uma página estática
(`public/index.html`) que consome a própria API por `fetch`. Por ela dá para
**buscar (QUERY)**, **listar (LIST)**, **adicionar (ADD)** e **editar (FIX)**
termos por formulários — sem precisar de `curl`/PowerShell e sem mudar a
arquitetura (o estado continua em memória no servidor; a página é só um cliente
HTTP). O JSON com a lista de endpoints continua disponível em `GET /api`.

## Exemplos via terminal (curl)

```bash
curl localhost:3000/health
# {"status":"ok"}

curl -X POST localhost:3000/termos \
  -H 'Content-Type: application/json' \
  -d '{"chave":"TCP","definicao":"Protocolo confiável e orientado a conexão."}'
# 201 {"chave":"TCP","definicao":"..."}

curl localhost:3000/termos/TCP
# 200 {"chave":"TCP","definicao":"..."}

curl -X PUT localhost:3000/termos/TCP \
  -H 'Content-Type: application/json' \
  -d '{"definicao":"Transmission Control Protocol."}'
# 200 {"chave":"TCP","definicao":"..."}

curl localhost:3000/termos
# 200 [{"chave":"TCP","definicao":"..."}]
```

> No Windows/PowerShell, o `curl` é um apelido para `Invoke-WebRequest` e não
> entende `-X`/`-H`/`-d`. Para evitar essa confusão, use a **interface web** ou o
> **cliente interativo** abaixo (funcionam igual em qualquer sistema operacional).

## Cliente interativo (sem precisar de curl)

O servidor é uma **API REST**: o terminal onde roda `npm run dev` é *apenas o
servidor* e não lê comandos digitados. Para interagir sem montar requisições à
mão, o `src/cliente.ts` lê comandos e faz o HTTP por baixo — no mesmo espírito do
cliente das atividades de socket.

Com o servidor rodando em um terminal, abra **outro** terminal e execute:

```bash
npm run cliente
```

Exemplo de sessão:

```
glossário> ADD TCP Protocolo confiável e orientado a conexão.
  TCP → Protocolo confiável e orientado a conexão.
glossário> QUERY TCP
  TCP → Protocolo confiável e orientado a conexão.
glossário> FIX TCP Transmission Control Protocol.
  TCP → Transmission Control Protocol.
glossário> LIST
  TCP → Transmission Control Protocol.
glossário> SAIR
```

Comandos: `ADD <chave> <definição>`, `FIX <chave> <definição>`, `QUERY <chave>`,
`LIST`, `HELP`, `SAIR`. A `<chave>` é uma única palavra; o restante da linha é a
definição. O endereço do servidor pode ser trocado pela variável de ambiente
`GLOSSARIO_URL` (padrão `http://localhost:3000`).

## Demonstração de concorrência (mutex por chave)

Como os handlers são síncronos, a serialização do lock não aparece numa
requisição HTTP comum. Para tornar a estratégia de bloqueio **visível**, o
`src/demo-concorrencia.ts` exercita o `withKeyLock` diretamente, com atrasos
artificiais:

```bash
npm run demo
```

Ele imprime uma linha do tempo de três cenários:

1. **Mesma chave → serializa**: operações sobre a mesma chave rodam uma de cada
   vez (A1 → A2 → A3).
2. **Chaves diferentes → em paralelo**: chaves distintas não se bloqueiam.
3. **Erro não quebra a corrente**: se uma operação falha no meio, as seguintes
   sobre a mesma chave ainda executam.

É a forma prática de comprovar o "plano de bloqueios transacionais" exigido.

## Status da Entrega 1

- [x] Decisão tecnológica documentada e justificada (seção *Tecnologias*).
- [x] Repositório organizado com README (descrição, tecnologias, estrutura, como rodar).
- [x] Estado central em memória modelado (`Map<string, string>`).
- [x] Protocolo de comunicação definido (rotas REST, formatos de request/response, códigos de status).
- [x] Servidor base rodando na porta fixa, com rota de teste (`GET /health`).
- [x] Validações de formato e regras de negócio (Zod + unicidade/existência no store).
- [x] Plano de bloqueios transacionais (mutex por chave, em `src/locks.ts`).

Além do mínimo exigido, a entrega inclui uma **interface web** (`GET /`), um
**cliente de linha de comando** (`npm run cliente`) para interação sem `curl` e
uma **demonstração executável do mutex por chave** (`npm run demo`).

## Equipe do Projeto

<div align="center">

  <table>
    <tr>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/162474087?v=4" width="100px" alt="Bruno Ramos"/><br/>
        <b>Bruno Ramos</b>
      </td>
      <td align="center">
        <img src="" width="100px" alt="Flávia Vitória"/><br/>
        <b>Flávia Vitória</b>
      </td>
      <td align="center">
        <img src="" width="100px" alt="Felipe Berardo"/><br/>
        <b>Felipe Berardo</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/149613054?v=4" width="100px" alt="Diogo Rodrigues"/><br/>
        <b>Diogo Rodrigues</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/73610632?v=4" width="100px" alt="Gryghor Camonni"/><br/>
        <b>Gryghor Camonni</b>
      </td>
    </tr>
  </table>

</div>

---

<p align="center">
  &copy; 2026 Universidade Federal de Pernambuco - Centro de Informática. Todos os direitos reservados.
</p>

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=66CDAA&height=120&section=header"/>
