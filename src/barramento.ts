// Barramento de eventos interno do servidor (Entrega 3).
//
// Por que existe: desacopla quem PRODUZ mudanças de estado (o `store`, quando um
// termo é criado/retificado; o `locks`, quando uma trava é adquirida/liberada)
// de quem as CONSOME (o endpoint SSE em `app.ts`, que as repassa para a interface
// em tempo real). Sem ele, `store`/`locks` precisariam conhecer a camada HTTP.
//
// É um EventEmitter do Node embrulhado numa API mínima e tipada. Eventos:
//   "termos:mudou" -> Termo[]       (lista completa após ADD/FIX)
//   "locks:mudou"  -> EstadoLock[]  (travas ativas: ocupadas e/ou com fila)

import { EventEmitter } from "node:events";
import type { Termo } from "./store";
import type { EstadoLock } from "./locks";

interface MapaEventos {
  "termos:mudou": Termo[];
  "locks:mudou": EstadoLock[];
}

class Barramento {
  private readonly ee = new EventEmitter();

  constructor() {
    // Cada conexão SSE registra ouvintes; sem limite para não emitir warning
    // de "possible memory leak" quando houver muitos clientes simultâneos.
    this.ee.setMaxListeners(0);
  }

  emitir<E extends keyof MapaEventos>(evento: E, dados: MapaEventos[E]): void {
    this.ee.emit(evento, dados);
  }

  // Inscreve um ouvinte e devolve uma função para cancelar a inscrição
  // (chamada quando a conexão SSE do cliente é encerrada).
  inscrever<E extends keyof MapaEventos>(
    evento: E,
    ouvinte: (dados: MapaEventos[E]) => void,
  ): () => void {
    this.ee.on(evento, ouvinte as (dados: unknown) => void);
    return () => {
      this.ee.off(evento, ouvinte as (dados: unknown) => void);
    };
  }
}

export const barramento = new Barramento();
