# Glossario Tecnico Compartilhado

**CIN0143 - Introducao aos Sistemas Distribuidos e Redes de Computadores (26.1)**  
**Grupo 10**

Este projeto e uma atividade avaliativa da disciplina CIN0143. A proposta e implementar um sistema distribuido cliente-servidor usando **Sockets TCP** para gerenciar um repositorio compartilhado de termos de engenharia, permitindo consulta rapida por equipes de campo.

O servidor aceita multiplas conexoes simultaneas e trabalha com um repositorio global de pares **chave-definicao**. Os clientes podem:

- **QUERY**: consultar um termo
- **ADD**: inserir um novo termo
- **FIX**: atualizar uma definicao existente

O uso de TCP garante entrega ordenada dos comandos e ajuda a manter a integridade das modificacoes. Para evitar conflitos quando mais de um cliente tenta alterar o mesmo termo ao mesmo tempo, o servidor utiliza mecanismos de bloqueio (lock/mutex) sobre o glossario compartilhado.

---

## Estrutura

```text
.
|-- servidor.py   # Servidor TCP multithread
|-- cliente.py    # Cliente interativo
|-- README.md
```

---

## Requisitos

- Python 3.6 ou superior
- Sem bibliotecas externas

---

## Como executar

1. Inicie o servidor:

```bash
python servidor.py
```

2. Em outro terminal, abra um cliente:

```bash
python cliente.py
```

Opcionalmente, informe host e porta:

```bash
python cliente.py 127.0.0.1 9090
```

---

## Comandos disponiveis

| Comando | Descricao | Exemplo |
|---|---|---|
| `QUERY <termo>` | Consulta a definicao de um termo | `QUERY Socket` |
| `ADD <termo> <definicao>` | Insere um novo termo | `ADD Latencia Tempo de atraso na rede` |
| `FIX <termo> <nova definicao>` | Atualiza uma definicao existente | `FIX TCP Protocolo de transporte confiavel` |
| `LIST` | Lista todos os termos cadastrados | `LIST` |
| `EXIT` | Encerra a conexao | `EXIT` |

---

## Visao geral da arquitetura

- **Cliente-servidor TCP**: cada cliente abre uma conexao com o servidor e envia comandos textuais.
- **Multiplas conexoes**: o servidor cria uma thread para atender cada cliente.
- **Armazenamento global**: os termos ficam em uma estrutura compartilhada no servidor.
- **Concorrencia controlada**: o lock protege operacoes de leitura e escrita para evitar sobreposicao de alteracoes.

---

## Objetivo da atividade

O projeto demonstra, na pratica, conceitos centrais de sistemas distribuidos e redes de computadores:

- comunicacao cliente-servidor
- concorrencia com multiplos clientes
- sincronizacao de acesso a dados compartilhados
- consistencia e integridade das modificacoes


## Equipe do Projeto

<div align="center">

  <table>
    <tr>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/162474087?v=4" width="100px" alt="Pessoa 1"/><br/>
        <b>Bruno Ramos 1</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/155683708?v=4" width="100px" alt="Lucas Cabral"/><br/>
        <b>Flávia Vitória</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/204962998?v=4" width="100px" alt="Samuel Miranda"/><br/>
        <b>Felipe Berardo</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/149613054?v=4" width="100px" alt="Pessoa 3"/><br/>
        <b>Diogo Rodrigues</b>
      </td>
      <td align="center">
        <img src="https://avatars.githubusercontent.com/u/73610632?v=4" width="100px" alt="Pessoa 3"/><br/>
        <b>Gryghor Camonni</b>
      </td>
    </tr>
  </table>

</div>

---

<p align="center">
  &copy; 2025 Universidade Federal de Pernambuco - Centro de Informática. Todos os direitos reservados.
</p>

<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=66CDAA&height=120&section=header"/>