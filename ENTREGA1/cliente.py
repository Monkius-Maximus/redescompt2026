import socket
import sys

HOST = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
PORTA = int(sys.argv[2]) if len(sys.argv) > 2 else 9090

AJUDA = "Comandos: QUERY <termo> | ADD <termo> <def> | FIX <termo> <def> | LIST | EXIT"


def conectar():
    try:
        cliente = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        cliente.connect((HOST, PORTA))
    except ConnectionRefusedError:
        print(f"Erro: servidor não encontrado em {HOST}:{PORTA}.")
        sys.exit(1)

    print(f"Conectado em {HOST}:{PORTA}")
    print(AJUDA)

    try:
        # Exibe a mensagem inicial enviada pelo servidor
        boas_vindas = cliente.recv(1024).decode("utf-8")
        print(f"Servidor: {boas_vindas.strip()}\n")

        while True:
            try:
                entrada = input(">>> ").strip()
            except EOFError:
                entrada = "EXIT"

            if not entrada:
                continue
            # HELP é tratado localmente, sem enviar ao servidor
            if entrada.upper() == "HELP":
                print(AJUDA)
                continue

            cliente.sendall(entrada.encode("utf-8"))
            resposta = cliente.recv(4096).decode("utf-8").strip()
            print(f"Servidor: {resposta}\n")

            if resposta == "SAINDO":
                break
    except KeyboardInterrupt:
        pass
    finally:
        cliente.close()


conectar()
