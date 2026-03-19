# Changelog

## [v1.4.2] - 2026-03-19

### Features
- A criacao de audiencias ganhou um fluxo novo em `Nova Audiencia`, com escolha entre `Importar` e `Criar de contatos`, reaproveitando a base sincronizada por instancia.
- O modo `Criar de contatos` passou a suportar audiencia por `Etiquetas`, com selecao de uma ou mais labels da instancia e previsao da quantidade de contatos antes da confirmacao.
- O modo `Criar de contatos` passou a suportar audiencia por `Naming`, com busca normalizada em minusculas e correspondencia por `contains` sobre os nomes sincronizados.
- O modal de criacao de audiencia foi redesenhado para seguir o mesmo design system do modal de detalhes da audiencia, com cabecalho destacado, cards contextuais e secoes mais consistentes com o modulo.

### Fixes
- A contagem e a criacao de audiencias a partir dos contatos sincronizados deixaram de truncar em `1000` registros e passaram a ler a base em lotes.
- O fluxo de `Naming` deixou de exigir match exato e passou a encontrar contatos cujo nome contenha o termo digitado apos normalizacao.
- A criacao de audiencias a partir de contatos sincronizados deixou de falhar por ausencia de regra persistida, com a introducao da tabela de regras de refresh automatico.

### Infrastructure
- Foi adicionada a migration `20260319233000_audience_sync_rules.sql`, criando `audience_sync_rules_dispara_lead_saas_02` para persistir a origem e os criterios de audiencias baseadas em contatos sincronizados.
- A Edge Function `sync-instance-contacts` passou a atualizar automaticamente as audiencias vinculadas a uma instancia ao final do sync, adicionando novos contatos elegiveis por `Etiquetas` ou `Naming`.

## [v1.4.1] - 2026-03-19

### Features
- A gestao de audiencias ganhou um modal de detalhes completo, com busca por nome/telefone, paginacao real, adicao e remocao de contatos sem sair da lupa.
- A audiencia passou a permitir manutencao de tags no proprio modal de detalhes, incluindo vinculo de tags existentes, criacao imediata e remocao direta.
- O fluxo de adicionar contatos na audiencia foi ampliado para suportar importacao manual, texto em lote e arquivo CSV/XLSX com mapeamento de colunas.
- A importacao por arquivo passou a validar o schema de variaveis da audiencia atual e bloquear importacoes com variaveis faltantes ou extras.

### Fixes
- O modal da lupa em Publicos foi redesenhado para respeitar melhor o tema claro/escuro, corrigir scroll interno e usar confirmacoes internas do app no lugar de dialogs nativos do navegador.
- O modal de detalhes de audiencia passou a manter o contador de contatos consistente via trigger/RPC e a carregar dados de forma paginada em vez de buscar tudo de uma vez.
- A listagem de chats deixou de falhar em ambientes com RPC antiga de `get_instance_contacts`, com fallback seguro no frontend e alinhamento da RPC remota para paginação real.
- A visibilidade dos chats foi corrigida para o modelo multi-tenant novo, com RLS baseada em `get_current_tenant_id()` / `is_user_super_admin()`.
- Disparos de campanha enviados passaram a ser projetados automaticamente para a malha de chat (`contacts_dispara_lead_saas_02` e `messages_dispara_lead_saas_02`), inclusive com backfill dos historicos ja enviados.

### Performance
- A tela de chats recebeu cache local por instancia e por contato, reduzindo a latencia ao alternar instancias e reabrir conversas recentes.
- `ChatDetails` deixou de disparar consultas em serie e passou a carregar blocos em paralelo.
- Foram adicionados indices para `instances`, `contacts`, `messages` e para a nova RPC de conversas, melhorando a troca de instancia e a abertura das mensagens.

### UX
- O rodape da sidebar foi refinado, com agrupamento visual melhor entre `Sair` e `Claro/Escuro`, boxes dedicados, gradientes coerentes e melhor uso do espaco vertical.
- A pagina de Publicos e seus modais foram alinhados visualmente com o esquema verde do modulo e com melhor consistencia entre light/dark mode.

### Infrastructure
- Foram adicionadas e aplicadas as migrations `20260319160000_audience_contacts_management.sql`, `20260319173000_audience_metadata_schema_rpc.sql`, `20260319210000_update_get_instance_contacts_pagination.sql`, `20260319213000_fix_chat_visibility_and_sync_campaign_logs.sql` e `20260319220000_optimize_chat_queries.sql`.
- A RPC `get_instance_contacts` passou a aceitar `p_limit` e `p_offset`, mantendo compatibilidade com o payload usado pela UI de atendimento.

## [v1.4.0] - 2026-03-19

### Features
- A plataforma passou a suportar memberships multi-tenant, permitindo que o mesmo usuario participe de multiplas empresas com contexto ativo por tenant.
- Foi criada a tabela `user_tenant_memberships_dispara_lead_saas_02`, com backfill do modelo legado e sincronizacao de owner principal por tenant.
- O frontend foi adaptado para trabalhar com tenant efetivo por membership em `Users`, `Settings`, `Dashboard`, `Sidebar`, `InstanceManager`, `AudienceSplitUpload`, `AudienceDefinition`, `UserTagManager`, `TenantDetails` e servicos de Supabase.
- Foi criada a nova tela `Contatos`, com lista de instancias, selecao por instancia, busca textual e filtro dedicado por label, lendo os contatos sincronizados diretamente da base local.
- O fluxo de sincronizacao de contatos por instancia foi implementado com persistencia de labels, contatos, vinculos contato-label e historico de execucoes, permitindo acompanhar o sync sem depender de consultas em tempo real a UazAPI na renderizacao da tela.

### Fixes
- Convites e gestao de usuarios deixaram de sobrescrever `tenant_id` no perfil global e passaram a criar/remover acessos por membership.
- O modelo de ownership foi endurecido para garantir exatamente `1 owner` ativo por tenant, permitindo ao mesmo usuario ser owner de multiplos tenants.
- O script administrativo local de onboarding passou a forcar `https://disparalead.bflabs.com.br/finish-profile` nos emails, sem alterar o comportamento da function de producao.
- A autenticacao da Edge Function `sync-instance-contacts` foi alinhada ao padrao real do app, com verificacao manual do bearer e configuracao central de `verify_jwt = false`, eliminando o `401` de gateway durante a chamada autenticada do frontend.
- A tela `Contatos` deixou de truncar a listagem em `1000` registros e passou a buscar a base em lotes, alem de separar claramente metricas de base persistida e metricas do ultimo sync para evitar ambiguidade de leitura.

### Infrastructure
- Foram adicionadas as migrations `20260319120000_multi_tenant_memberships.sql` e `20260319133000_enforce_single_owner_per_tenant.sql`.
- Foi criada a Edge Function `bulk-tenant-onboarding` para onboarding em lote e tambem um fluxo administrativo local em `scripts/admin/` com suporte a `dry-run`, `apply` e envio de convite.
- Foi criado um script local para provisionamento em lote de instancias na UazAPI, seguindo a mesma logica da tela de instancias e registrando webhooks automaticamente.
- O onboarding real do cliente AM Consorcios foi executado com criacao de tenants, usuarios, memberships e instancias por usuario nao-owner.
- Foi adicionada a migration `20260319190000_instance_contact_sync_schema.sql`, criando as tabelas `instance_labels_dispara_lead_saas_02`, `instance_contacts_dispara_lead_saas_02`, `instance_contact_labels_dispara_lead_saas_02` e `instance_contact_sync_runs_dispara_lead_saas_02` com RLS por tenant.
- Foi criada e deployada a Edge Function `sync-instance-contacts`, responsavel por sincronizar `GET /labels`, `POST /contacts/list` e `POST /chat/details` para uma instancia especifica.

## [v1.3.0] - 2026-03-12

### Features
- Dashboard e Logs agora abrem com janela padrao de `7 dias`, com expansao server-side sob demanda para periodos maiores.
- O pipeline de campanhas ganhou contadores atomicos (`sent_count`, `failed_count`), circuit breaker por tenant e materialized view diaria para stats.
- O painel admin recebeu novas consultas agregadas, ajustes de performance e suporte a super admins globais.

### Fixes
- Corrigida a consistencia de tenant em impersonation, incluindo `Disparo`, `Dashboard`, `Logs` e leituras administrativas.
- Adicionado `ErrorBoundary` e guardas defensivas em rotas/componentes com risco de tela branca por shape inesperado.
- Corrigidas chamadas do frontend para Edge Functions: rotas publicas usam helper anonimo e rotas sensiveis voltaram a exigir sessao autenticada.
- `auth_manager_dispara_lead` agora exige usuario autenticado para convites; somente `recovery` permanece publico.

### Infrastructure
- `enqueue-campaign` passou a publicar payload minimo no QStash com `messageId`, `campaignId`, `lead` e `message`.
- Completion de campanha foi movido para a RPC atomica `complete_campaign_if_finished(...)`.
- Foram adicionados indices para `message_logs_dispara_lead_saas_03` e uma trilha de runbooks SQL para deploy manual seguro.
- `process-message` e `process-message-ai` foram adaptadas para usar a nova camada atomica e redeployadas apos as migrations.

## [v1.2.1] - 2026-03-12

### 🐛 Correções & Melhorias (Fixes & Improvements)
- **Recuperação de senha:** Corrigido o fluxo de "Esqueci minha senha" para chamar a Edge Function correta `auth_manager_dispara_lead` em vez de `manage-users`.
- **Tratamento de erro no frontend:** A tela de recuperação agora valida `data.error` da Edge Function e deixa de exibir falso positivo de "Email enviado".
- **Auth anônimo para recovery:** Ajustado o request da recuperação para enviar `Authorization: Bearer <anon key>`, compatível com o comportamento atual do endpoint remoto.
- **Falha explícita no envio de email:** A Edge Function `auth_manager_dispara_lead` agora retorna erro quando `BREVO_API_KEY` não estiver configurada, em vez de fingir sucesso sem envio.

## [v1.2.0] - 2026-01-23

### 🚀 Novidades (Features)
- **Slider de Tempo:** Substituído os campos manuais de "min/max" por um slider visual (30s a 200s), com padrão de 30s-60s e trava de segurança de 20s de diferença mínima entre os valores.
- **Suporte a Vídeo:** Agora é possível selecionar "Vídeo" como tipo de mídia nas campanhas, com upload de arquivo ou URL.
- **Importação Inteligente de Públicos (Tela de Públicos):**
    - Novo assistente de importação na tela "Públicos" que permite selecionar qual coluna é o **Nome**.
    - Opção de importar o "Nome Completo" ou apenas o "Primeiro Nome".
    - **Formatação Automática (Title Case):** Nomes em MAIÚSCULAS são automaticamente convertidos para formato capitalizado (Ex: "BRUNO GUERRA" → "Bruno Guerra" ou "Bruno").
    - Pré-visualização em tempo real mostrando o nome formatado antes de confirmar a importação.
    - Modal de importação ampliado para melhor usabilidade (menos scroll).

### 🐛 Correções & Melhorias (Fixes & Improvements)
- **Correção de Variáveis (IA & Templates):**
    - Resolvido problema onde variáveis como `@name` não eram substituídas se o cabeçalho do CSV estivesse em maiúsculo (ex: "NOME"). O sistema agora é *case-insensitive*.
    - **Proteção de Dados na IA:** Ajustado o prompt da Inteligência Artificial para não remover nomes, telefones e variáveis durante a reescrita.
- **Tratamento de Erros:**
    - Números inválidos agora retornam status de sucesso para a fila (fila não trava), mas marcam erro no log do sistema, evitando disparos repetidos infinitamente.
    - Melhoria nos logs para facilitar identificação de erros futuros.
    - **Log Detalhado:** O sistema salva o retorno exato (JSON) da API em caso de falha, visível no painel ao passar o mouse sobre o status "Falha".
    - **Proteção contra "Falso Disconnected":** Se a API retornar erro de desconexão, o sistema faz uma verificação dupla. Se a instância estiver online, ele tenta novamente automaticamente (erro transiente). Se estiver realmente offline, ele para de tentar (erro fatal), economizando recursos e evitando campanhas travadas.

---

## 📱 Texto para Envio aos Clientes (WhatsApp)

Olá! 👋
Temos novidades fresquinhas na plataforma! Confira o que acabou de chegar:

✅ **Vídeo nas Campanhas:** Agora você pode enviar vídeos diretamente nas suas campanhas em massa! Mais engajamento para seus leads. 🎥

✅ **Ajuste de Tempo Visual:** Ficou mais fácil definir o atraso entre mensagens. Use o novo "slider" para arrastar e escolher o tempo (30s a 200s). ⏱️

✅ **Importação de Nomes Inteligente:** Ao criar um público, agora você pode escolher a coluna de nome e se quer o nome completo ou só o primeiro. Nomes em MAIÚSCULAS são formatados automaticamente! Ex: "BRUNO" → "Bruno". ✨

✅ **IA Mais Inteligente:** Melhoramos nossa Inteligência Artificial para garantir que ela nunca mude os nomes ou dados importantes dos seus contatos. 🤖🔒

✅ **Mais Estabilidade:** Corrigimos problemas com campanhas que mostravam "desconectado" mesmo com instância online. Agora o sistema faz dupla checagem antes de marcar como falha. 🛡️

Atualize sua página e aproveite! 🚀
Qualquer dúvida, estamos à disposição.
