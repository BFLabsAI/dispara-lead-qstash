# Plano de Implantacao: Multi-Tenant Membership Sem Duplicar Auth Users

**Data:** 2026-03-19
**Projeto:** DisparaLead
**Objetivo:** permitir que um mesmo usuario autenticado tenha acesso a multiplos tenants com papeis distintos, sem criar multiplos registros em `auth.users`.

---

## Resumo Executivo

O modelo atual do projeto e `1 auth user -> 1 linha em users_dispara_lead_saas_02 -> 1 tenant`.
Isso impede que um mesmo usuario atue como `admin` ou `member` em mais de uma empresa.

A implantacao proposta muda o modelo para:

- `auth.users`: continua 1 registro por pessoa
- `users_dispara_lead_saas_02`: passa a representar o perfil global do usuario
- `user_tenant_memberships_dispara_lead_saas_02`: nova tabela de associacao usuario x tenant
- `current_tenant_id` em `users_dispara_lead_saas_02`: tenant ativo na sessao

Esse desenho evita duplicacao de credenciais, preserva auditoria por usuario real e reduz impacto no frontend, porque o app continua operando em um tenant por vez.

---

## Decisoes de Arquitetura

### 1. Manter um unico `auth.users` por pessoa

- nao criar usuarios duplicados no Auth
- email e identidade continuam centralizados
- recuperacao de senha e login continuam simples

### 2. Transformar `users_dispara_lead_saas_02` em perfil global

- uma linha por `auth.uid()`
- campos globais: `id`, `email`, `full_name`, `avatar_url`, `is_super_admin`
- adicionar `current_tenant_id`
- manter `tenant_id` e `role` apenas durante transicao se necessario

### 3. Criar tabela de memberships

Nova tabela:

- `user_tenant_memberships_dispara_lead_saas_02`

Campos:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `tenant_id uuid not null references tenants_dispara_lead_saas_02(id) on delete cascade`
- `role text not null check (role in ('owner', 'admin', 'member'))`
- `status text not null default 'active' check (status in ('invited', 'active', 'disabled'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `invited_by uuid null references auth.users(id)`

Restricoes e indices:

- `unique (user_id, tenant_id)`
- indice por `user_id`
- indice por `tenant_id`
- indice por `(tenant_id, role, status)`

### 4. Tenant ativo por sessao

O app continuara funcionando em um tenant por vez:

- `users_dispara_lead_saas_02.current_tenant_id` guarda o contexto atual
- o usuario pode trocar de empresa no frontend
- o backend e o RLS validam se esse tenant pertence ao usuario

---

## Fases de Execucao

## Fase 1. Database Foundation

### Task 1.1

Criar migration para:

- adicionar `current_tenant_id` em `users_dispara_lead_saas_02`
- criar `user_tenant_memberships_dispara_lead_saas_02`
- criar indices e constraints
- criar trigger de `updated_at` se necessario

### Task 1.2

Criar funcoes auxiliares novas:

- `public.is_member_of_tenant(p_tenant_id uuid)`
- `public.get_current_tenant_id_v2()`
- `public.get_my_memberships()`
- `public.set_current_tenant_id(p_tenant_id uuid)`
- `public.get_my_role_for_tenant(p_tenant_id uuid)`

### Task 1.3

Backfill de dados:

- para cada linha atual em `users_dispara_lead_saas_02` com `tenant_id not null`
- criar membership correspondente com `role`
- copiar `tenant_id` para `current_tenant_id` quando nulo

### Task 1.4

Compatibilidade temporaria:

- manter `tenant_id` e `role` na tabela `users_dispara_lead_saas_02` durante a migracao
- marcar esses campos como legado no codigo
- planejar remocao posterior apenas depois da estabilizacao

---

## Fase 2. RLS e Funcoes SQL

### Task 2.1

Reescrever helpers que hoje assumem um unico tenant:

- `get_my_tenant_id()`
- `get_current_tenant_id()`
- `is_super_admin()`
- `is_user_super_admin()`

Objetivo:

- tenant efetivo vem de `current_tenant_id`
- acesso permitido apenas se houver membership ativa para `auth.uid()`

### Task 2.2

Atualizar policies tenant-scoped:

- `instances_dispara_lead_saas_02`
- `campaigns_dispara_lead_saas_02`
- `audiences_dispara_lead_saas_02`
- `tags_dispara_lead_saas_02`
- `company_settings_dispara_lead_saas_02`
- `message_logs_dispara_lead_saas_03`
- tabelas indiretas como `audience_contacts` e `audience_tags`

Padrao:

- permitir acesso se `tenant_id = get_current_tenant_id()` e membership ativa
- manter bypass de `is_super_admin()` onde cabivel

### Task 2.3

Criar policies para a tabela de memberships:

- usuario ve as proprias memberships
- owner/admin do tenant ve memberships do tenant
- super admin ve tudo
- alteracoes limitadas a owner/admin/super admin

---

## Fase 3. Signup, Invite e Lifecycle de Usuario

### Task 3.1

Atualizar `handle_new_user()`:

- signup normal cria tenant
- cria perfil global em `users_dispara_lead_saas_02`
- cria membership `owner`
- define `current_tenant_id`

### Task 3.2

Atualizar `auth_manager_dispara_lead`:

- parar de sobrescrever `users.tenant_id` e `users.role`
- fazer upsert do perfil global por `id`
- criar ou atualizar membership por `(user_id, tenant_id)`
- se usuario ja existir no auth, apenas adicionar nova membership
- se usuario nao existir, criar user no auth e depois membership

### Task 3.3

Atualizar `manage-users`:

- listar usuarios por membership do tenant atual
- delete passa a remover membership do tenant, nao necessariamente o auth user
- so remover `auth.users` quando usuario nao tiver mais nenhuma membership e isso fizer sentido operacional

### Task 3.4

Definir regra de remocao:

- remover usuario de uma empresa = apagar membership daquele tenant
- remover usuario do sistema inteiro = operacao administrativa separada

---

## Fase 4. Frontend e Fluxos de Sessao

### Task 4.1

Atualizar resolucao de tenant:

- `getEffectiveTenantId()` passa a ler `current_tenant_id`
- criar fetch centralizado de memberships do usuario
- cachear memberships quando util

### Task 4.2

Criar seletor de tenant para usuarios multi-tenant:

- nao restrito a super admin
- exibir quando usuario tiver mais de uma membership ativa
- trocar tenant via RPC `set_current_tenant_id`
- invalidar caches apos troca

### Task 4.3

Atualizar telas e stores que usam `.single()` em `users_dispara_lead_saas_02` para inferir tenant:

- `UsersPage`
- `Login`
- `FinishProfilePage`
- `AppSidebar`
- `AdminRoute`
- `copyAgentStore`
- `InstanceManager`
- `AudienceDefinition`
- `AudienceSplitUpload`
- `audienceService`
- demais pontos encontrados por busca

### Task 4.4

Atualizar listagem de usuarios por tenant:

- fonte principal passa a ser membership + join com perfil global
- exibir papel por tenant
- convites passam a associar membership ao tenant atual

---

## Fase 5. Migracao de Dados

### Task 5.1

Escrever migration idempotente de backfill:

- inserir memberships para todos os usuarios existentes
- evitar duplicatas com `on conflict do nothing`
- preencher `current_tenant_id` a partir do tenant legado

### Task 5.2

Validacoes SQL pos-migracao:

- nenhum usuario nao super admin fica sem membership
- nenhum tenant ativo fica sem owner
- nenhum `current_tenant_id` aponta para tenant sem membership correspondente

### Task 5.3

Criar queries de auditoria em runbook:

- usuarios com mais de uma membership
- memberships duplicadas
- profiles sem membership
- memberships sem profile

---

## Fase 6. Testes e Validacao

### Task 6.1

Cobertura de banco:

- usuario com 1 tenant continua funcionando
- usuario com 2 tenants acessa apenas tenant ativo
- troca de tenant altera visibilidade
- owner/admin pode convidar para tenant proprio
- mesmo email pode ser adicionado a segundo tenant sem novo auth user

### Task 6.2

Cobertura de frontend:

- login normal continua redirecionando corretamente
- seletor de tenant aparece apenas quando aplicavel
- `UsersPage` lista membros do tenant ativo
- cache e query invalidation apos trocar tenant

### Task 6.3

Cobertura operacional:

- campanha, logs, audiences e settings respeitam tenant ativo
- super admin continua com impersonation
- multi-tenant comum nao ganha privilegios de super admin

---

## Ordem Recomendada de Implementacao

1. migration de schema + backfill
2. funcoes SQL + RLS
3. `auth_manager_dispara_lead`
4. `manage-users`
5. resolver central de tenant no frontend
6. seletor de tenant para usuarios multi-tenant
7. telas dependentes de tenant
8. testes e validacao

---

## Riscos Principais

### Risco 1

Quebra de RLS por manter funcoes antigas retornando um unico tenant sem validar membership.

Mitigacao:

- reescrever helpers primeiro
- testar acesso cruzado antes de deploy

### Risco 2

Convite para segundo tenant sobrescrever tenant atual do usuario.

Mitigacao:

- mover logica de associacao para tabela de memberships
- proibir escrita em `users.tenant_id` fora do fluxo de compatibilidade

### Risco 3

Frontend continuar usando `.single()` em perfil para descobrir tenant.

Mitigacao:

- centralizar tenant efetivo em helper unico
- buscar memberships explicitamente onde necessario

### Risco 4

Delete de usuario remover acesso global por engano.

Mitigacao:

- redefinir delete como remocao de membership
- separar exclusao de auth user em operacao administrativa distinta

---

## Criterios de Aceite

- um email autenticado pode pertencer a 2 ou mais tenants
- o mesmo `auth.users.id` aparece em multiplas memberships
- owner/admin consegue adicionar usuario existente a outro tenant
- usuario alterna tenant sem novo login
- RLS bloqueia acesso fora do tenant ativo
- fluxos atuais de usuario single-tenant continuam funcionando
- super admin continua operando normalmente

---

## Entregaveis

- migration SQL completa
- atualizacao das Edge Functions afetadas
- atualizacao do frontend para tenant ativo + memberships
- runbook de validacao SQL e aplicacao
- testes direcionados para acesso multi-tenant

---

## Execucao Imediata

As frentes de execucao devem ocorrer em paralelo:

- Frente A: schema, backfill e RLS
- Frente B: invites, manage-users e lifecycle
- Frente C: frontend, stores e tenant switcher

O merge final deve acontecer apenas depois de:

- validar queries SQL principais
- revisar todos os usos de `users_dispara_lead_saas_02` no app
- garantir que o fluxo de usuario single-tenant nao regrediu
