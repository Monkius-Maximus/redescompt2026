import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { addBodySchema, fixBodySchema } from "./schemas";
import * as store from "./store";
import { TermoJaExisteError, TermoNaoEncontradoError } from "./store";

export const app = express();

// Faz o parsing do corpo JSON (necessário para POST/PUT).
app.use(express.json());

// Middleware único de validação de formato (uma forma só de validar).
// Em falha, responde 422; em sucesso, substitui o corpo pelos dados já
// normalizados (com trim) e segue para o handler.
function validarCorpo<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      res.status(422).json({ erro: "validação falhou", detalhes: r.error.issues });
      return;
    }
    req.body = r.data;
    next();
  };
}

// Rota de teste exigida na Entrega 1.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// LIST — GET /termos
app.get("/termos", (_req: Request, res: Response) => {
  res.status(200).json(store.list());
});

// QUERY — GET /termos/:chave
app.get("/termos/:chave", (req: Request<{ chave: string }>, res: Response) => {
  res.status(200).json(store.query(req.params.chave));
});

// ADD — POST /termos
app.post(
  "/termos",
  validarCorpo(addBodySchema),
  async (req: Request, res: Response) => {
    const { chave, definicao } = req.body;
    res.status(201).json(await store.add(chave, definicao));
  },
);

// FIX — PUT /termos/:chave
app.put(
  "/termos/:chave",
  validarCorpo(fixBodySchema),
  async (req: Request<{ chave: string }>, res: Response) => {
    const { definicao } = req.body;
    res.status(200).json(await store.fix(req.params.chave, definicao));
  },
);

// Tratador de erros: mapeia erros de domínio para status HTTP.
// (Express 5 encaminha erros de handlers async para cá automaticamente.)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof TermoNaoEncontradoError) {
    res.status(404).json({ erro: err.message });
    return;
  }
  if (err instanceof TermoJaExisteError) {
    res.status(409).json({ erro: err.message });
    return;
  }
  console.error(err); // log mínimo para erros inesperados
  res.status(500).json({ erro: "erro interno" });
});
