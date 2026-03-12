# New Skills Execution Checklist

## Metadata

- Timestamp: `2026-03-12_08-45-52 -03`
- Projeto: `dispara-lead-qstash`
- Responsavel: `Codex`
- Status: `draft`
- Objetivo: `converter as skills novas em checklist operacional por frente`
- Documento base:
  - [2026-03-12_08-44-20_new-skills-use-cases-and-how-to.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/tasks/2026-03-12_08-44-20_new-skills-use-cases-and-how-to.md)

## Ordem geral

1. `qa-testing-strategy`
2. `qa-testing-playwright`
3. `supabase-performance-tuning`
4. `sql-query-optimizer`
5. `scalability-playbook`

## Frente 1: Dashboard e Logs

### Skills

- `qa-testing-strategy`
- `qa-testing-playwright`
- `supabase-performance-tuning`
- `sql-query-optimizer`

### Checklist

- [ ] definir cenários prioritários de `/dashboard` e `/logs`
- [ ] separar smoke test de regressão mínima
- [ ] abrir as duas rotas em browser real
- [ ] capturar console, network e tempo percebido de carregamento
- [ ] identificar queries, RPCs ou leituras amplas acionadas por essas telas
- [ ] revisar se há paginação, limites e colunas mínimas
- [ ] verificar se a lentidão nasce no Supabase ou no cliente
- [ ] registrar qual ajuste de performance gera maior impacto com menor risco

### Sinais de alerta

- leitura integral de logs;
- requests em cascata;
- payloads grandes;
- filtros feitos só no cliente;
- loading longo sem erro visível.

## Frente 2: Edge Functions

### Skills

- `qa-testing-strategy`
- `supabase-performance-tuning`
- `scalability-playbook`

### Checklist

- [ ] listar functions críticas do fluxo
- [ ] definir quais são smoke e quais são críticas sob carga
- [ ] medir se a function faz trabalho demais por requisição
- [ ] revisar se há round-trips excessivos ao Supabase
- [ ] revisar uso de RPCs, inserts, updates e fan-out por request
- [ ] separar gargalo de lógica, banco e integração externa
- [ ] registrar quais functions precisam de otimização imediata

### Sinais de alerta

- muitas consultas por execução;
- payload grande;
- processamento serial;
- fan-out sem controle;
- retry caro ou repetitivo.

## Frente 3: QStash e Fluxo de Fila

### Skills

- `qa-testing-strategy`
- `scalability-playbook`

### Checklist

- [ ] mapear o fluxo `enqueue -> process -> webhook/callback`
- [ ] definir cenários de validação segura e cenários críticos de throughput
- [ ] confirmar que endpoints respondem rápido na fase de aceitação
- [ ] verificar se as mensagens carregam só o necessário
- [ ] revisar risco de fan-out grande por campanha
- [ ] revisar comportamento esperado de retry, idempotência e assinatura
- [ ] registrar pontos que podem degradar sob volume alto

### Sinais de alerta

- payload grande na fila;
- endpoint lento;
- retry sem distinção de erro transitório e erro definitivo;
- acoplamento forte entre fila e consultas caras.

## Frente 4: UI QA e Falhas Reais de Rota

### Skills

- `qa-testing-strategy`
- `qa-testing-playwright`

### Checklist

- [ ] priorizar rotas por impacto operacional
- [ ] rodar fluxo real de usuário autenticado
- [ ] registrar erros de render, loading infinito e requests falhos
- [ ] comparar o comportamento entre rotas principais e rotas admin
- [ ] repetir os cenários após cada ajuste importante
- [ ] consolidar uma regressão mínima obrigatória

### Rotas sugeridas

- `/dashboard`
- `/logs`
- `/chats`
- `/audiences`
- `/instancias`
- `/admin/plans`

### Sinais de alerta

- tela branca;
- conteúdo vazio sem erro claro;
- requests `200` com estado visual quebrado;
- console com exceção não tratada;
- comportamento intermitente entre refresh e navegação.

## Frente 5: Escalabilidade Geral

### Skills

- `scalability-playbook`
- `supabase-performance-tuning`
- `sql-query-optimizer`

### Checklist

- [ ] identificar os fluxos que mais crescem com volume de tenant
- [ ] separar gargalo de leitura, escrita, fila e processamento
- [ ] avaliar impacto de campanhas grandes e tenants pesados
- [ ] revisar custo de consultas repetidas e leituras agregadas
- [ ] priorizar mudanças estruturais antes de micro-otimizações
- [ ] transformar os achados em backlog por camada

### Sinais de alerta

- degradação forte com tenants grandes;
- crescimento linear de custo por campanha;
- gargalos repetidos em várias telas;
- volume alto quebrando UX e não só latência.

## Como usar este checklist

1. escolher uma frente
2. usar apenas as skills listadas para aquela frente
3. preencher o checklist com evidência, não com impressão
4. abrir fix ou subtask só depois de fechar os itens críticos

## Critério de conclusão

- cada frente precisa sair com:
  - evidência concreta;
  - gargalo principal;
  - skill que gerou o achado;
  - próximo ajuste recomendado.
