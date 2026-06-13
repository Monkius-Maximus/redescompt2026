import { app } from "./app";

// Porta fixa do servidor (a Entrega 1 exige "porta fixada").
// Ajustar para a porta definida pelo professor/equipe, se houver.
const PORTA = 3000;

app.listen(PORTA, () => {
  console.log(`Glossário Técnico ouvindo em http://localhost:${PORTA}`);
});
