# Tasks Review Process

Esta pasta centraliza execucoes de revisao, debugging e performance do projeto.

## Objetivo

Padronizar como abrimos uma investigacao, quais skills usamos, quais evidencias coletamos e como registramos decisoes, achados e proximos passos.

## Estrutura

- `TEMPLATE.md`: modelo base para abrir uma nova task.
- `YYYY-MM-DD_HH-MM-SS_slug.md`: execucao documentada de uma revisao.

## Convencao de nome

Use sempre:

```text
YYYY-MM-DD_HH-MM-SS_titulo-curto.md
```

Exemplo:

```text
2026-03-12_07-51-54_stability-review-white-screens.md
```

## Skills e quando usar

### `systematic-debugging`

Use como skill principal quando houver bug, inconsistencia, regressao ou falha sem causa clara.

Responsabilidades:
- impedir correcao por chute;
- exigir reproducao;
- mapear causa raiz antes de editar codigo;
- separar sintoma de origem do problema.

### `debugging`

Use para a execucao pratica da investigacao.

Responsabilidades:
- coletar stack trace, logs e contexto;
- criar reproducao minima;
- isolar componente quebrado;
- validar fix e regressao.

### `debugging-strategies`

Use quando o problema atravessa camadas ou e intermitente.

Responsabilidades:
- comparar ambiente bom vs quebrado;
- testar hipoteses de forma controlada;
- inspecionar data flow entre frontend, API, fila, workers e banco;
- usar logs, debugger e profiling com metodo.

### `performance-optimization`

Use quando o sintoma principal ou secundario for lentidao, timeout, travamento ou rendering degradado.

Responsabilidades:
- medir antes de otimizar;
- investigar bundle, renderizacao, queries e cache;
- priorizar ganhos com impacto em UX e throughput.

## Fluxo padrao de revisao

1. Abrir uma task nova usando `TEMPLATE.md`.
2. Registrar timestamp, titulo do projeto de testes e escopo do incidente.
3. Classificar o sintoma.
4. Escolher a combinacao de skills.
5. Descrever hipoteses iniciais sem implementar fix.
6. Coletar evidencias por camada.
7. Confirmar causa raiz.
8. Definir plano de correcao.
9. Executar validacao e regressao.
10. Registrar status final, riscos restantes e proximos passos.

## Classificacao rapida de sintomas

- Tela branca: comecar com `systematic-debugging` + `debugging`.
- Dados nao aparecem: comecar com `systematic-debugging` + `debugging-strategies`.
- Inconsistencias entre telas, usuarios ou status: comecar com `systematic-debugging` + `debugging-strategies`.
- Lentidao, timeout, congelamento ou render atrasado: adicionar `performance-optimization`.

## Evidencias minimas por task

Cada task deve registrar:

- sintoma observado;
- impacto no negocio;
- passos para reproducao;
- ambiente e usuario afetado;
- requests, responses e logs relevantes;
- estado esperado vs atual;
- causa raiz confirmada ou hipoteses abertas;
- decisao sobre fix, rollback ou mitigacao;
- teste executado;
- risco residual.

## Regra operacional

Nao editar codigo antes de existir evidencia suficiente para sustentar uma causa raiz ou, no minimo, uma hipotese testavel e isolada.
