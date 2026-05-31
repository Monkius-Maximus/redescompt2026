import socket
import threading

# Repositório compartilhado entre todos os clientes
glossario = {}

# Lock para evitar conflito entre threads ao modificar o glossário
lock = threading.Lock()


def processar_comando(comando: str) -> str:
    # Separa em no máximo 3 partes: operação, termo e definição
    partes = comando.strip().split(" ", 2)

    if not partes or partes[0] == "":
        return "ERRO: Comando vazio."

    operacao = partes[0].upper()

    if operacao == "QUERY":
        if len(partes) < 2:
            return "ERRO: Uso -> QUERY <termo>"
        termo = partes[1].strip()
        with lock:
            return f"OK: {termo} -> {glossario[termo]}" if termo in glossario else f"NÃO ENCONTRADO: '{termo}'"

    elif operacao == "ADD":
        if len(partes) < 3:
            return "ERRO: Uso -> ADD <termo> <definicao>"
        termo, definicao = partes[1].strip(), partes[2].strip()
        with lock:
            if termo in glossario:
                return f"DUPLICADO: '{termo}' já existe. Use FIX para atualizar."
            glossario[termo] = definicao
            return f"OK: '{termo}' inserido."

    elif operacao == "FIX":
        if len(partes) < 3:
            return "ERRO: Uso -> FIX <termo> <nova definicao>"
        termo, nova_definicao = partes[1].strip(), partes[2].strip()
        with lock:
            if termo not in glossario:
                return f"NÃO ENCONTRADO: '{termo}'. Use ADD para inserir."
            glossario[termo] = nova_definicao
            return f"OK: '{termo}' atualizado."

    elif operacao == "LIST":
        with lock:
            if not glossario:
                return "VAZIO: O glossário esta vazio."
            linhas = [f"  [{i+1}] {k}: {v}" for i, (k, v) in enumerate(glossario.items())]
            return "TERMOS:\n" + "\n".join(linhas)

    elif operacao == "EXIT":
        return "SAINDO"

    return f"ERRO: Comando '{operacao}' desconhecido."


def handle_cliente(conn: socket.socket, addr: tuple):
    print(f"[+] {addr} conectado")
    try:
        conn.sendall(b"Bem-vindo ao Glossario Tecnico!\n")
        while True:
            dados = conn.recv(1024)
            if not dados:
                break
            comando = dados.decode("utf-8").strip()
            print(f"  [{addr}] >> {comando}")
            resposta = processar_comando(comando)
            conn.sendall((resposta + "\n").encode("utf-8"))
            if resposta == "SAINDO":
                break
    except ConnectionResetError:
        pass
    finally:
        conn.close()
        print(f"[-] {addr} desconectado")


def iniciar_servidor(host: str = "0.0.0.0", porta: int = 9090):
    servidor = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # SO_REUSEADDR permite reiniciar sem esperar o SO liberar a porta
    servidor.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    servidor.bind((host, porta))
    servidor.listen(10)
    print(f"Servidor iniciado em {host}:{porta}\n")
    try:
        while True:
            conn, addr = servidor.accept()
            # Cada cliente roda em uma thread separada
            threading.Thread(target=handle_cliente, args=(conn, addr), daemon=True).start()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        servidor.close()


iniciar_servidor()
