# Glossario Tecnico Compartilhado

Equipe 10 | Atividade 01 | Sistemas Distribuidos | Socket TCP

Sistema distribuido cliente-servidor com Sockets TCP para gerenciamento de um glossario tecnico de engenharia. Suporta multiplas conexoes simultaneas com controle de concorrencia via locks.

---

## Estrutura do Projeto

```
glossario-tecnico/
|-- servidor.py   # Servidor TCP multithread com lock de acesso ao glossario
|-- cliente.py    # Cliente interativo que se conecta ao servidor
|-- README.md
```

---

## Requisitos

- Python 3.6 ou superior
- Nenhuma biblioteca externa (usa apenas `socket` e `threading` da stdlib)

---

## Como Executar

### 1. Iniciar o servidor

```bash
python servidor.py
```

O servidor inicia na porta 9090 e aguarda conexoes.

### 2. Conectar um cliente

Em outro terminal:

```bash
python cliente.py
```

Para conectar em outro host ou porta:

```bash
python cliente.py 192.168.1.10 9090
```

Abra quantos terminais quiser para simular multiplos clientes ao mesmo tempo.

---

## Comandos Disponiveis

| Comando | Descricao | Exemplo |
|---|---|---|
| `QUERY <termo>` | Consulta a definicao de um termo | `QUERY Socket` |
| `ADD <termo> <definicao>` | Insere um novo termo | `ADD Latencia Tempo de atraso na rede` |
| `FIX <termo> <nova definicao>` | Atualiza definicao existente | `FIX TCP Protocolo da camada de transporte` |
| `LIST` | Lista todos os termos cadastrados | `LIST` |
| `EXIT` | Encerra a conexao | `EXIT` |

---

## Exemplo de Sessao

```
>>> ADD Socket Ponto de comunicacao bidirecional entre dois processos
Servidor: OK: 'Socket' inserido.

>>> QUERY Socket
Servidor: OK: Socket -> Ponto de comunicacao bidirecional entre dois processos

>>> FIX Socket Endpoint de comunicacao que permite troca de dados via rede
Servidor: OK: 'Socket' atualizado.

>>> LIST
Servidor: TERMOS:
  [1] Socket: Endpoint de comunicacao que permite troca de dados via rede

>>> EXIT
Servidor: SAINDO
```

---

## Arquitetura

### Socket TCP
Garante que os comandos cheguem ao servidor na ordem correta e sem perdas, essencial para a integridade das operacoes no glossario.

### Multithreading
Cada cliente recebe uma thread dedicada (`threading.Thread`), permitindo que multiplos clientes operem ao mesmo tempo sem bloquear uns aos outros.

### Controle de Concorrencia
O dicionario `glossario` e compartilhado entre todas as threads. Um `threading.Lock()` envolve toda operacao de leitura ou escrita, garantindo que modificacoes nao se sobreponham:

```
Cliente A (thread 1) -> ADD "Kernel" -> adquire lock -> escreve -> libera lock
Cliente B (thread 2) -> FIX "TCP"   -> aguarda lock -> escreve -> libera lock
```
