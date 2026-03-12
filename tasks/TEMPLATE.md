# [TASK TITLE]

## Metadata

- Timestamp:
- Projeto de testes:
- Responsavel:
- Status: `draft` | `in_progress` | `blocked` | `done`
- Severidade: `low` | `medium` | `high` | `critical`
- Skills aplicadas:
- Ambientes afetados:
- Links de apoio:

## Contexto

Descreva o problema em uma ou duas frases objetivas.

## Sintoma principal

- Tela branca
- Dados nao aparecem
- Inconsistencia de dados
- Lentidao ou timeout
- Outro:

## Impacto

- Quem e afetado:
- Fluxo afetado:
- Consequencia para operacao:

## Escopo da revisao

- O que esta dentro da investigacao:
- O que esta fora da investigacao:

## Hipoteses iniciais

Liste hipoteses sem implementar fix.

1.
2.
3.

## Skills escolhidas e motivo

- `systematic-debugging`:
- `debugging`:
- `debugging-strategies`:
- `performance-optimization`:

## Passos de reproducao

1.
2.
3.

## Evidencias coletadas

### Frontend

- Console:
- Estado:
- Render:

### Network / API

- Endpoint:
- Payload:
- Status code:
- Diferenca entre esperado e atual:

### Fila / Jobs / Integracoes

- QStash:
- Webhooks:
- Retries:

### Banco / Supabase

- Tabelas envolvidas:
- Query ou RPC:
- RLS / permissao:
- Estado persistido:

## Analise de causa raiz

Descreva a causa raiz confirmada. Se ainda nao houver confirmacao, declarar explicitamente.

## Plano de acao

1.
2.
3.

## Tarefas detalhadas

- [ ] Confirmar reproducao em ambiente controlado
- [ ] Coletar logs e traces
- [ ] Validar payloads entre camadas
- [ ] Comparar usuario afetado vs usuario saudavel
- [ ] Confirmar estado no banco
- [ ] Isolar modulo ou componente com falha
- [ ] Definir fix minimo
- [ ] Executar regressao
- [ ] Documentar resultado final

## Validacao

- Testes executados:
- Resultado:
- Cenarios cobertos:
- Cenarios nao cobertos:

## Resultado final

- Decisao:
- Fix aplicado:
- Pendencias:
- Risco residual:

## Proximos passos

1.
2.
3.
