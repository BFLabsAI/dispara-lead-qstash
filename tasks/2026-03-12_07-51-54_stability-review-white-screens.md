# Stability Review - White Screens, Missing Data and Inconsistencies

## Metadata

- Timestamp: `2026-03-12_07-51-54 -03`
- Projeto de testes: `dispara-lead-qstash stability review`
- Responsavel: `Codex + time de produto/engenharia`
- Status: `draft`
- Severidade: `high`
- Skills aplicadas: `systematic-debugging`, `debugging`, `debugging-strategies`, `performance-optimization`
- Ambientes afetados: `a confirmar`
- Links de apoio: [code-review.md](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/code-review.md)

## Contexto

Usuarios reportaram telas brancas, ausencia de dados em algumas telas e inconsistencias de informacao. O objetivo desta task e estruturar a investigacao sem cair em correcoes por tentativa e erro.

## Sintoma principal

- Tela branca
- Dados nao aparecem
- Inconsistencia de dados

## Impacto

- Quem e afetado: usuarios finais e operadores internos
- Fluxo afetado: carregamento de telas, leitura de dashboards, consultas de dados operacionais e possiveis fluxos dependentes de jobs
- Consequencia para operacao: perda de confianca na interface, impossibilidade de seguir fluxos e risco de decisao baseada em dado incorreto

## Escopo da revisao

- O que esta dentro da investigacao:
  - erros de frontend que resultam em tela branca;
  - falhas de fetch, permissao, estado ou renderizacao;
  - inconsistencias entre UI, API, jobs e banco;
  - lentidao que degrade carregamento ou atualizacao visual.
- O que esta fora da investigacao:
  - redesign visual;
  - refatoracoes amplas sem relacao direta com o incidente;
  - melhorias oportunistas nao ligadas a causa raiz.

## Hipoteses iniciais

1. Erro de runtime no frontend esta quebrando renderizacao de paginas especificas.
2. Dados estao sendo filtrados, cacheados ou invalidados de forma inconsistente entre cliente e backend.
3. Existe divergencia entre estado persistido no Supabase e o que a UI espera consumir.
4. Parte dos sintomas pode ser causada por lentidao de query, waterfall de requests ou bloqueio de render.

## Skills escolhidas e motivo

- `systematic-debugging`: skill principal para garantir investigacao de causa raiz antes de qualquer fix.
- `debugging`: usada para reproducao, isolamento do modulo quebrado e validacao de correcao.
- `debugging-strategies`: usada para comparar usuario afetado vs nao afetado e mapear quebra entre camadas.
- `performance-optimization`: usada apenas se ficar evidenciado que a tela branca ou sumico de dados decorre de timeout, query lenta ou renderizacao pesada.

## Passos de reproducao

1. Levantar quais telas, usuarios e horarios concentram os relatos.
2. Reproduzir o comportamento em ambiente local ou homologacao com usuario e dados equivalentes.
3. Abrir console, network e logs relevantes durante a reproducao.
4. Comparar o mesmo fluxo com um usuario sem problema reportado.

## Evidencias coletadas

### Frontend

- Console: sem erros fatais nas rotas inspecionadas; apenas warnings de React Router v7
- Estado: `adminStore` persiste `impersonatedTenantId` e `adminTenantId`, o que favorece tenant stale entre sessoes e navegacao
- Render: sem tela branca reproduzida na sessao atual, mas o app nao tem `ErrorBoundary` global e varias rotas protegidas dependem da `AppSidebar`
- Rotas validadas em browser autenticado:
  - `/dashboard`: carregou, mas puxou `5519` registros em lotes de 1000
  - `/instancias`: carregou corretamente nesta rodada, apos esperas anteriores ter mostrado loading prolongado
  - `/chats`: carregou conversas e confirmou uso de instancias multi-tenant sem filtro explicito na query do componente
  - `/admin/plans` e `/admin/email-templates`: carregaram apos etapa inicial de `Verificando permissoes...`
- Estado quebrado realmente observado nesta rodada:
  - nao houve tela branca total
  - houve excesso de erros de console do Vite client por perda de websocket de HMR em `localhost:8080`, mas isso nao explica relato de usuarios finais em runtime produtivo

### Network / API

- Endpoint:
  - `GET /rest/v1/message_logs_dispara_lead_saas_03?...offset=0..5000&limit=1000`
  - `GET /rest/v1/campaigns_dispara_lead_saas_02?...tenant_id=eq.<tenant>`
  - `GET /rest/v1/instances_dispara_lead_saas_02?select=instance_name,status&order=created_at.desc`
  - `POST /rest/v1/rpc/get_instance_contacts`
- Payload: queries reais observadas em `localhost:8080` apontando para `https://<SUPABASE_PROJECT_REF>.supabase.co`
- Status code: todos os requests inspecionados retornaram `200`
- Diferenca entre esperado e atual:
  - dashboard faz leitura integral de logs do tenant em paginas de 1000 registros, totalizando `5519` registros na sessao observada;
  - `ChatSidebar` carrega instancias sem filtro explicito de tenant;
  - ha divergencia de estrategia de tenant entre queries de logs e calculo de stats.

### Fila / Jobs / Integracoes

- `enqueue-campaign`: validado em runtime com chamada autenticada e payload seguro vazio
  - resposta: `200`
  - corpo: `{"success":false,"stage":"Validation","error":"Invalid or empty \"messages\" array"...}`
  - conclusao: edge function esta publicada, autenticacao funciona e a validacao inicial esta ativa
- `process-message`: validado em runtime com `POST` sem `Upstash-Signature`
  - resposta: `401 Missing signature`
  - conclusao: worker esta ativo e a verificacao de assinatura do QStash esta protegendo a rota
- `webhook_messages_dispara_lead_saas`: validado em runtime com payload sintetico seguro
  - resposta: `{"received":true}`
  - conclusao: endpoint responde e aceita payload no formato esperado sem quebrar
- Evidencia historica de cadeia ponta a ponta:
  - campanhas recentes em `campaigns_dispara_lead_saas_02` com `status=completed`, `started_at`, `completed_at` e `total_messages`
  - logs recentes em `message_logs_dispara_lead_saas_03` com `status=sent`, `scheduled_for`, `sent_at` e `responded_at`
  - existem registros com `responded_at` nao nulo, confirmando processamento posterior ao envio
- Retries: existe `retryWithBackoff` manual em `supabaseClient.ts`, em paralelo ao uso de React Query

### Banco / Supabase

- Tabelas envolvidas:
  - `users_dispara_lead_saas_02`
  - `tenants_dispara_lead_saas_02`
  - `campaigns_dispara_lead_saas_02`
  - `message_logs_dispara_lead_saas_03`
  - `instances_dispara_lead_saas_02`
  - `contacts_dispara_lead_saas_02`
  - `messages_dispara_lead_saas_02`
- Query ou RPC:
  - `get_my_tenant_id`
  - `is_super_admin`
  - `get_dashboard_stats`
  - `get_instance_contacts`
- RLS / permissao:
  - o app depende fortemente de RLS para isolamento, mas algumas queries do frontend nao aplicam filtro explicito de tenant
- Estado persistido:
  - tenant efetivo e tenant de admin sao persistidos em `admin-storage`

## Analise de causa raiz

Causa raiz unica ainda nao confirmada, mas ja existem causas provaveis fortes por categoria:

1. `tenant drift` entre telas
   - `getEffectiveTenantId()` usa `impersonatedTenantId` do Zustand ou RPC `get_my_tenant_id`
   - `getDashboardStatsOptimized()` ignora impersonation e usa sempre o `tenant_id` do usuario autenticado
   - efeito esperado: cards, tabelas e outras telas podem refletir tenants diferentes no mesmo contexto autenticado

2. sobrecarga e inconsistencias por fetch integral
   - `fetchAllDisparadorData()` busca todos os logs em lotes de 1000 ate acabar
   - evidencia real da sessao: `5519` registros carregados para a dashboard
   - efeito esperado: telas lentas, loading prolongado, risco maior de timeout visual e comportamento inconsistente entre componentes

3. dados misturados ou ausentes em atendimento
   - `ChatSidebar` busca instancias sem `.eq('tenant_id', ...)`
   - contatos dependem de RPC com fallback restrito apenas a um erro de assinatura
   - efeito esperado: listas vazias, instancias fora do tenant e inconsistencias intermitentes

4. observabilidade fraca e fallback para vazio
   - partes do sistema transformam erro em arrays vazios ou cache expirado
   - efeito esperado: usuario percebe "sumiu dado" em vez de erro rastreavel

5. risco estrutural de tela branca
   - o app nao possui `ErrorBoundary` global
   - a `AppSidebar` participa de praticamente todas as rotas protegidas e faz multiplos fetches sensiveis
   - qualquer excecao nessa arvore pode derrubar o app inteiro pos-login

6. crash latente em componentes com pressupostos de shape
   - `ChatSidebar` usa `(c.name || c.phone).toLowerCase()`
   - `Audiences` usa `a.name.toLowerCase()`
   - `DashboardTable` usa `errorText.startsWith(...)` assumindo string
   - `audienceService` faz `.map(...)` em `a.audience_tags_dispara_lead_saas_02` sem guarda defensiva
   - efeito esperado: basta um registro malformado para derrubar uma rota inteira sem `ErrorBoundary`

## Plano de acao

1. Corrigir e unificar a resolucao de tenant efetivo em todos os servicos e KPIs.
2. Remover leitura integral de logs das telas principais e migrar para paginacao/queries agregadas.
3. Aplicar filtro explicito de tenant nas queries de `instances` e revisar `get_instance_contacts`.
4. Introduzir tratamento de erro visivel e `ErrorBoundary` para evitar tela branca total.
5. Revisar pontos que retornam `[]` ou cache expirado em caso de erro para diferenciar "sem dado" de "falha".
6. Validar regressao em dashboard, logs, chats e instancias com tenant normal e super admin em impersonation.

## Tarefas detalhadas

- [ ] Mapear lista de telas com relato de tela branca
- [ ] Identificar usuarios afetados, tenant e horario aproximado
- [x] Capturar erro de console e stack trace
- [x] Capturar requests falhas ou respostas vazias
- [x] Validar se existe diferenca de permissao, tenant ou filtro
- [ ] Confirmar se jobs e webhooks relacionados executaram corretamente
- [x] Confirmar se jobs e webhooks relacionados executaram corretamente
- [x] Conferir estado persistido no frontend para tenant/admin impersonation
- [x] Isolar se a inconsistenca nasce no backend ou na transformacao do frontend
- [x] Acionar `performance-optimization` se houver timeout, query lenta ou bloqueio de render
- [ ] Definir fix minimo com teste de regressao
- [ ] Atualizar esta task com resultado final e risco residual

## Validacao

- Testes executados:
  - navegacao real com browser em `localhost:8080`
  - inspecao de requests e console nas rotas protegidas
  - leitura de codigo nas areas de tenant, dashboard, logs, chats e sidebar
  - validacao segura de edge functions `enqueue-campaign`, `process-message` e `webhook_messages_dispara_lead_saas`
  - consulta autenticada a campanhas e logs recentes no Supabase do app
- Resultado:
  - nao houve tela branca total reproduzida nesta sessao
  - houve confirmacao de riscos concretos de inconsistencias por tenant, sobrecarga de fetch e crashes latentes por shape inesperado
  - houve confirmacao de runtime da cadeia `enqueue -> process-message protegido por assinatura -> webhook -> campanhas/logs concluidos`
- Cenarios cobertos:
  - dashboard autenticado
  - chats autenticado
  - carga inicial de sidebar e menu de super admin
  - admin plans
  - admin email templates
  - edge functions publicadas do app
- Cenarios nao cobertos:
  - troca real de impersonation durante a sessao
  - criacao de campanha nova com disparo real para numero valido
  - timeout sob carga ou fila congestionada
  - reproducao de tela branca total em conta afetada especifica

## Resultado final

- Decisao: `investigacao com riscos priorizados`
- Fix aplicado: `nao`
- Pendencias:
  - validar impersonation em runtime
  - confirmar impacto do filtro de tenant em chats e instancias
  - reproduzir em conta/tenant afetado por usuario real para capturar stack de tela branca
  - definir primeira correcao de menor risco
- Risco residual: `alto`, especialmente para inconsistencias de dados e loading pesado em tenants com alto volume

## Proximos passos

1. Criar subtasks por frente:
   - tenant consistency
   - dashboard/logs performance
   - chat tenant isolation
   - error boundaries and observability
2. Escolher um caso reproduzivel de super admin com impersonation e comparar dashboard vs chats vs logs.
3. Implementar o primeiro fix minimo onde o risco e mais objetivo: tenant efetivo ou fetch integral de logs.

---

## Metadata - Proxima Execucao

- Timestamp: `2026-03-12_08-31-00 -03`
- Projeto de testes: `dispara-lead-qstash remediation planning`
- Responsavel: `Codex + time de produto/engenharia`
- Status: `planned`
- Severidade: `high`
- Skills previstas: `systematic-debugging`, `debugging`, `performance-optimization`
- Objetivo: `corrigir riscos de inconsistencias, evitar tela branca por excecao e reduzir pontos de falha nas rotas mais sensiveis`

## Escopo da proxima execucao

- O que sera feito:
  - unificacao de tenant efetivo nas leituras criticas;
  - adicao de guardas defensivas em componentes com risco de crash por shape inesperado;
  - introducao de `ErrorBoundary` global ou de alto nivel;
  - reducao do overfetch do dashboard e melhoria de observabilidade de erro.
- O que nao sera feito nesta rodada:
  - refatoracao ampla de arquitetura;
  - redesign de telas;
  - disparo real de campanha para numeros validos;
  - mudancas oportunistas fora dos fluxos afetados.

## Plano operacional

1. Frente `tenant consistency`
   - revisar todos os pontos que resolvem tenant no frontend;
   - criar uma unica estrategia para `tenant efetivo`;
   - alinhar dashboard, chats, instancias e consultas auxiliares a essa mesma fonte.

2. Frente `crash prevention`
   - adicionar guardas de null/undefined em listas e filtros;
   - revisar componentes que fazem `toLowerCase`, `startsWith`, `map` e `JSON.parse` sem validacao previa;
   - impedir que um registro malformado derrube a rota inteira.

3. Frente `error boundary`
   - introduzir um boundary global nas rotas autenticadas;
   - garantir fallback visual com contexto minimo de erro;
   - evitar tela branca total em excecoes nao tratadas.

4. Frente `dashboard/logs performance`
   - atacar a leitura integral de logs;
   - preferir paginacao e agregacao em vez de carregar todo o historico;
   - reduzir tempo de carregamento inicial e risco de travamento visual.

## Tarefas detalhadas da proxima execucao

- [x] Mapear todos os consumidores de `tenant_id` e `impersonatedTenantId`
- [x] Definir funcao ou servico unico para tenant efetivo
- [x] Atualizar dashboard para nao divergir de impersonation
- [x] Aplicar filtro explicito de tenant em pontos criticos de chats e instancias
- [x] Adicionar guardas em `ChatSidebar`
- [x] Adicionar guardas em `Audiences`
- [x] Adicionar guardas em `DashboardTable`
- [x] Revisar `audienceService` para colecoes opcionais
- [x] Revisar `PlansList` para nao depender de `JSON.parse` em render sem fallback
- [x] Implementar `ErrorBoundary` nas rotas protegidas
- [x] Reduzir ou remover fetch integral de logs do dashboard
- [x] Validar regressao manual nas rotas `/dashboard`, `/chats`, `/audiences`, `/instancias` e `/admin/plans`
- [x] Atualizar esta documentacao com resultado da implementacao

## Critérios de conclusao

- Nenhuma rota principal deve cair por excecao simples de dado nulo ou shape inesperado.
- Dashboard nao deve depender de leitura integral de milhares de logs para render inicial.
- Tenant exibido em dashboard, chats e instancias deve ser consistente sob usuario normal e impersonation.
- Em caso de erro nao tratado, o usuario deve ver fallback controlado em vez de tela branca total.

## Riscos e dependencias

- Pode haver dependencia de comportamento atual de impersonation em rotas admin.
- Parte da validacao completa depende de usuario/tenant com relato real de problema.
- Mudancas em consultas podem exigir revisao posterior de performance no Supabase.

## Resultado da implementacao

- Status: `partially completed`
- Resultado tecnico:
  - `tenant consistency` foi centralizado em `getEffectiveTenantId()` e os stats do dashboard agora respeitam impersonation;
  - dashboard deixou de carregar o historico completo por padrao e passou a usar uma janela recente de `1000` registros;
  - `ChatSidebar`, `Audiences`, `DashboardTable`, `audienceService` e `PlansList` ganharam guardas defensivas contra `null`, `undefined` e `JSON.parse` invalido;
  - `RouteErrorBoundary` foi aplicado nas arvores autenticadas e admin para evitar tela branca total em excecoes nao tratadas;
  - `ChatSidebar` passou a buscar instancias com filtro explicito de tenant.

## Arquivos alterados nesta execucao

- [src/App.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/App.tsx)
- [src/components/errors/AppErrorBoundary.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/errors/AppErrorBoundary.tsx)
- [src/components/errors/RouteErrorBoundary.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/errors/RouteErrorBoundary.tsx)
- [src/services/supabaseClient.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/supabaseClient.ts)
- [src/services/dashboardService.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/dashboardService.ts)
- [src/pages/Dashboard.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Dashboard.tsx)
- [src/pages/Logs.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Logs.tsx)
- [src/components/chat/ChatSidebar.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/chat/ChatSidebar.tsx)
- [src/pages/Audiences.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Audiences.tsx)
- [src/components/dashboard/Table.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/dashboard/Table.tsx)
- [src/services/audienceService.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/services/audienceService.ts)
- [src/pages/admin/PlansList.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/admin/PlansList.tsx)

## Validacao da implementacao

- Build:
  - `npm run build` executado com sucesso
  - warnings restantes de chunking/dynamic import ja existiam e nao bloquearam a compilacao
- Browser:
  - `/dashboard` carregou com `1000 de 1000 registros recentes`, confirmando remocao do overfetch de `5519` itens
  - `/admin/plans` carregou apos a etapa de permissao
  - `/chats` carregou sem crash de render
  - `/audiences` e parte das rotas continuam apresentando `TypeError: Failed to fetch` de forma intermitente em chamadas Supabase, o que aponta mais para falha operacional/rede do que para crash de render
- Limitacoes:
  - a intermitencia de `Failed to fetch` ainda precisa de investigacao separada
  - nao houve reproducao de tela branca total com usuario afetado especifico

## Risco residual apos esta execucao

- `medio`
- Principais pendencias:
  - validar impersonation com um caso real de tenant afetado
  - decidir se `Logs` tambem deve sair do modo de leitura integral para paginacao server-side

---

## Metadata - Correcao do `Failed to fetch`

- Timestamp: `2026-03-12_08-45-00 -03`
- Projeto de testes: `dispara-lead-qstash fetch stabilization`
- Responsavel: `Codex`
- Status: `completed`
- Severidade: `medium`
- Objetivo: `eliminar o `Failed to fetch` intermitente ligado a checagens de auth em rotas montadas com frequencia`

## Causa encontrada

- O erro intermitente estava associado a chamadas `supabase.auth.getUser()` em componentes de alto impacto de navegacao, especialmente:
  - [src/components/auth/AdminRoute.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/auth/AdminRoute.tsx)
  - [src/components/layout/AppSidebar.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/layout/AppSidebar.tsx)
- Evidencia coletada:
  - request `GET /auth/v1/user` aparecia como `net::ERR_ABORTED`
  - em seguida a mesma validacao costumava completar com `200`
  - o stack trace batia em `_getUser` do client Supabase
- Conclusao:
  - a falha nao era da query principal de `audiences` ou `plans`;
  - era ruido operacional de uma checagem de usuario remoto abortada durante montagem/navegacao.

## Correcao aplicada

- As checagens acima passaram a usar `supabase.auth.getSession()` em vez de `supabase.auth.getUser()`.
- Isso removeu a dependencia desnecessaria de roundtrip em `/auth/v1/user` para fluxos que so precisavam do usuario da sessao local.

## Arquivos alterados nesta frente

- [src/components/auth/AdminRoute.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/auth/AdminRoute.tsx)
- [src/components/layout/AppSidebar.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/layout/AppSidebar.tsx)

## Validacao da correcao

- `npm run build` executado com sucesso apos a mudanca
- Browser:
  - `/audiences` carregou sem erro de console e exibiu a lista corretamente
  - `/admin/plans` carregou sem erro de console e exibiu a tabela corretamente
  - o erro intermitente de `/auth/v1/user` deixou de aparecer nas rotas validadas

## Estado atual das tasks

- [x] Investigar origem do `TypeError: Failed to fetch`
- [x] Corrigir o ponto de auth que gerava abort intermitente
- [x] Revalidar `audiences`
- [x] Revalidar `admin/plans`
- [ ] Validar impersonation com um tenant real afetado
- [x] Avaliar paginacao server-side para `Logs`

---

## Metadata - Validacao com conta real

- Timestamp: `2026-03-12_08-56-00 -03`
- Projeto de testes: `dispara-lead-qstash runtime validation with real account`
- Responsavel: `Codex`
- Status: `completed with follow-up`
- Severidade: `medium`
- Objetivo: `validar o comportamento das rotas principais com uma conta real apos as correcoes de estabilidade`

## Conta usada nesta rodada

- Conta validada: `<ADMIN_EMAIL>`
- Observacao: a senha foi usada apenas para a execucao automatizada local e nao foi persistida na task.

## Validacao executada

- Login real no app em `http://127.0.0.1:8080`
- Navegacao end-to-end nas rotas:
  - `/dashboard`
  - `/logs`
  - `/audiences`
  - `/chats`
  - `/admin/plans`
- Coleta de erros de console durante a sessao

## Resultado observado

- Nenhuma das rotas validadas apresentou tela branca.
- Nao houve erro de console na sessao automatizada.
- Evidencias:
  - `/dashboard`: `1000 de 1000 registros recentes`
  - `/logs`: `50 de 5519 registros` e `Pagina 1 de 111`
  - `/audiences`: carregou sem crash
  - `/chats`: carregou sem crash
  - `/admin/plans`: carregou sem crash

## Achado adicional

- O login desta conta caiu inicialmente em `/admin`, mas o seletor `Navegar como` nao apareceu na sidebar.
- Isso indica uma inconsistência nova a investigar:
  - ou a conta recebeu acesso administrativo efetivo sem expor o estado de super admin no app;
  - ou existe divergencia entre a decisao de redirecionamento pos-login e a checagem real de permissao/tenant no restante da interface.

## Atualizacao sobre impersonation

- A validacao completa de impersonation de super admin ainda nao foi concluida.
- O que ficou confirmado ate aqui:
  - trocar o `tenant` no estado nao derruba `dashboard`, `logs` nem `chats`;
  - a sessao usada nos testes intermediarios nao representava um super admin valido para concluir essa prova;
  - a checagem definitiva ainda depende de uma sessao de super admin inequivoca.

## Estado atual consolidado

- [x] Dashboard estabilizado sem overfetch integral
- [x] Logs em paginacao server-side
- [x] `Failed to fetch` intermitente de auth corrigido
- [x] Rotas principais validadas com conta real sem tela branca
- [ ] Resolver a inconsistência de acesso/redirecionamento em `/admin`
- [ ] Fechar validacao de impersonation com sessao super admin inequívoca

---

## Metadata - Revalidacao de acesso admin e impersonation

- Timestamp: `2026-03-12_09-18-00 -03`
- Projeto de testes: `dispara-lead-qstash admin identity drift`
- Responsavel: `Codex`
- Status: `completed with blocker confirmed`
- Severidade: `high`
- Objetivo: `confirmar por que o login cai em /admin e por que a impersonation devolve vazio mesmo para tenant com dados`

## Evidencia coletada nesta rodada

- Login automatizado com `<ADMIN_EMAIL>` voltou a cair em `/admin`.
- A sessao exposta no browser apos login foi:
  - `email = <ADMIN_EMAIL>`
  - `userId = 09f6653f-61f1-422c-aa1a-be47c1236bf2`
- O estado persistido antes da troca era:
  - `adminTenantId = 0732f61e-9735-469d-84ea-63e874c9ec3b`
  - `impersonatedTenantId = 0732f61e-9735-469d-84ea-63e874c9ec3b`
- Ao forcar `impersonatedTenantId = a2903df2-7a7b-4574-9e5c-4c184f3daae5` (`Opticas Rocha`):
  - `/dashboard` passou para `Nenhum registro`
  - `/logs` passou para `Nenhum registro`
  - `/chats` carregou sem erro de console
  - o `admin-storage` refletiu a troca corretamente

## Cruzamento com banco

- Em `public.users_dispara_lead_saas_02`, o perfil encontrado para `<ADMIN_EMAIL>` foi:
  - `id = 6d711093-00a3-4360-a03f-11e623661e1c`
  - `tenant_id = a2903df2-7a7b-4574-9e5c-4c184f3daae5`
  - `is_super_admin = false`
- Em `auth.users`, a consulta via MCP continuou retornando apenas:
  - `id = 6d711093-00a3-4360-a03f-11e623661e1c`
  - `email = <ADMIN_EMAIL>`
- O tenant `a2903df2-7a7b-4574-9e5c-4c184f3daae5` possui `487` registros em `message_logs_dispara_lead_saas_03`.

## Conclusao tecnica

- O frontend agora:
  - limpa contexto admin stale no login;
  - limpa `admin-storage` quando a sessao nao e super admin;
  - continua sem crash nas rotas principais.
- Porem o bloqueio funcional permaneceu porque a identidade observada no browser (`09f6653f-...`) nao bate com o espelho consultado no banco (`6d711093-...`).
- Isso explica por que a impersonation troca o tenant no estado, mas nao consegue materializar os dados esperados em `/dashboard` e `/logs`.
- A causa raiz mais provavel saiu do frontend e passou a ser:
  - drift entre sessao autenticada e perfil publico;
  - ou existencia de identidade/auth nao reconciliada com `public.users_dispara_lead_saas_02`.

## Correcao aplicada nesta rodada

- [src/store/adminStore.ts](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/store/adminStore.ts)
  - adicionado `resetAdminContext()`
- [src/pages/Login.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/pages/Login.tsx)
  - limpeza de `admin-storage` antes do login
  - uso do `user.id` retornado por `signInWithPassword()`
- [src/components/layout/AppSidebar.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/layout/AppSidebar.tsx)
  - limpeza do contexto admin quando `is_super_admin` falha
- [src/components/auth/AdminRoute.tsx](/Users/brunofalcao/Desktop/Aplicações/dispara-lead-qstash/src/components/auth/AdminRoute.tsx)
  - limpeza do contexto admin quando o perfil nao e super admin

## Validacao da rodada

- `npm run build` executado com sucesso apos os ajustes
- O redirecionamento incorreto para `/admin` persistiu
- A impersonation continuou retornando vazio para `Opticas Rocha`, apesar de haver `487` logs no banco
- Nenhum erro de console foi emitido durante a execucao automatizada

## Estado consolidado apos esta rodada

- [x] Dashboard estabilizado sem overfetch integral
- [x] Logs em paginacao server-side
- [x] `Failed to fetch` intermitente de auth corrigido
- [x] Limpeza de `admin-storage` no login e nas guardas admin
- [x] Rotas principais seguem sem tela branca
- [ ] Resolver drift entre sessao autenticada e perfil publico do usuario
- [ ] Revalidar acesso `/admin` apos reconciliar identidade
- [ ] Revalidar impersonation com sessao e perfil reconciliados
