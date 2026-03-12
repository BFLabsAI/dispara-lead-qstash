# Safe Closeout and Deploy

- Date: `2026-03-12`
- Project: `DisparaLead`
- Status: `pre-deploy review`
- Goal: fechar o release sem quebrar auth, fila, impersonation ou rotas admin

## Context

Este documento existe porque a ultima rodada misturou:
- correcoes validas de produto/performance
- higienizacao de docs
- endurecimento de auth nas Edge Functions

Isso alterou runtime. Portanto, nao eh seguro sair fazendo deploy parcial sem checklist.

## O que mudou e afeta runtime

### Frontend

- `src/services/supabaseClient.ts`
  - novo helper `invokeAuthenticatedEdgeFunction(...)`
  - `invokePublicEdgeFunction(...)` foi mantido para rotas realmente publicas

- `src/pages/settings/UsersPage.tsx`
  - convites, delete e resend de usuarios agora usam helper autenticado

- `src/pages/admin/SuperAdminsPage.tsx`
  - convite de super admin agora usa helper autenticado

- `src/pages/admin/TenantDetails.tsx`
  - convite de usuario do tenant agora usa helper autenticado

- `src/services/uazapiClient.ts`
  - proxy UAZAPI agora usa helper autenticado

- `src/store/disparadorStore.ts`
  - `enqueue-campaign` agora usa helper autenticado
  - continua usando tenant efetivo em impersonation

- `src/services/campaignManagementService.ts`
  - resume/reenqueue de campanha agora usa helper autenticado

### Edge Functions

- `supabase/functions/auth_manager_dispara_lead/index.ts`
  - `recovery` continua publico
  - `invite` agora exige usuario autenticado
  - `invite` agora valida perfil e escopo:
    - super admin pode convidar super admin
    - owner/admin pode convidar apenas dentro do proprio tenant

- `supabase/functions/enqueue-campaign/index.ts`
  - agora valida bearer do usuario antes de publicar no QStash

- `supabase/config.toml`
  - `manage-users` passou para `verify_jwt = true`
  - `auth_manager_dispara_lead` segue `verify_jwt = false`, mas o codigo passou a restringir `invite`
  - `process-message` e `process-message-ai` continuam publicas por necessidade do QStash

## O que NAO foi deployado ainda

As mudancas abaixo estao no repo, mas nao devem ser assumidas como ativas no remoto:

- `supabase/functions/auth_manager_dispara_lead/index.ts`
- `supabase/functions/enqueue-campaign/index.ts`
- `supabase/config.toml`

Conclusao:
- se o frontend novo for deployado antes dessas functions/config, ha risco de quebra funcional
- se as functions/config forem deployadas sem smoke test, ha risco de quebra de convites ou disparo

## Ordem segura obrigatoria

### Etapa 1: congelar escopo

Antes de qualquer deploy:
- nao adicionar `deno.lock`
- nao adicionar `package-lock.json`
- nao adicionar artefatos locais do Playwright
- nao adicionar `supabase/.temp/*`

### Etapa 2: validar build local

Obrigatorio:

```bash
npm run build
```

Status atual:
- passou

### Etapa 3: validar functions alteradas

Functions criticas desta rodada:
- `auth_manager_dispara_lead`
- `enqueue-campaign`

Se `deno check` falhar por dependencia externa do ambiente, registrar isso e nao confundir com erro de codigo.

### Etapa 4: deploy das functions/config antes do frontend

Ordem:

```bash
supabase functions deploy auth_manager_dispara_lead
supabase functions deploy enqueue-campaign
supabase functions deploy manage-users
```

Observacao:
- `manage-users` precisa subir junto do `supabase/config.toml`, por causa de `verify_jwt = true`

### Etapa 5: smoke test obrigatorio apos deploy de functions

Rodar os cenarios abaixo ANTES de qualquer deploy final do frontend:

1. `Forgot password`
- esperado: continua funcionando sem sessao

2. `Invite user` em `UsersPage`
- esperado: usuario autenticado admin/owner consegue convidar

3. `Invite super admin`
- esperado: apenas super admin consegue convidar

4. `TenantDetails -> invite user`
- esperado: convite funciona apenas no tenant permitido

5. `Disparo -> iniciar campanha`
- esperado: `enqueue-campaign` aceita bearer autenticado e enfileira normalmente

6. `Resume campaign`
- esperado: reenfileiramento continua funcionando

7. `Instancias / UAZAPI`
- esperado: proxy continua autenticado e operando

### Etapa 6: somente depois deploy do frontend

Se e somente se os 7 smoke tests acima passarem:

```bash
npm run build
```

e entao seguir com o fluxo normal de publicacao do frontend.

## Cenarios de rollback

### Se quebrar convites

Rollback alvo:
- reverter deploy de `auth_manager_dispara_lead`
- revisar bearer recebido e perfil resolvido

### Se quebrar disparo

Rollback alvo:
- reverter deploy de `enqueue-campaign`
- verificar bearer autenticado e resposta de `supabase.auth.getUser(...)`

### Se quebrar users management

Rollback alvo:
- revisar `manage-users` com `verify_jwt = true`
- confirmar que o frontend esta enviando sessao real, nao anon key

## O que ainda falta no fechamento do release

- revisar e executar smoke test das functions acima
- concluir commit
- fazer push para `main`
- so depois decidir deploy do frontend

## Regra de operacao

Nao fazer:
- deploy parcial do frontend antes das functions
- `git add .`
- commit com artefatos locais
- assumir que `verify_jwt = false` eh aceitavel sem compensacao no handler

Fazer:
- deploy em ordem
- smoke test imediato
- rollback rapido se qualquer auth sensivel falhar
