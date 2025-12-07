Arquitetura de Disparos em Massa com QStash - Plano de Implementação
1. Visão Geral da Solução
1.1 Conceito Principal
A solução implementa uma arquitetura de fila distribuída onde QStash atua como intermediário de processamento assíncrono. O fluxo não é mais bloqueante no frontend, permitindo escalabilidade massiva de envios de mensagens via WhatsApp através da Evolution API.

1.2 Por Que QStash?
QStash é um serviço de fila serverless que resolve problemas críticos:

Fila Confiável: Armazena mensagens garantindo entrega, mesmo com falhas temporárias

Retry Automático: Tenta reenviar automaticamente até 3 vezes em caso de erro

Rate Limiting: Controla o throughput de requisições para não sobrecarregar Evolution API

Agendamento Nativo: Permite agendar envios para horários específicos

Transparência: Dashboard mostra cada mensagem enfileirada, processada ou falhada

1.3 Mudança de Paradigma
Antes: App → Evolution API (direto, bloqueante, sem garantias)

Agora: App → Banco de Dados → QStash → Edge Function → Evolution API → Supabase (Logs)

Cada camada tem responsabilidade específica e dados são persistidos em cada etapa.

2. Fluxo Completo de Envio
2.1 Etapa 1: Usuário Inicia Disparo (Frontend)
O usuário clica em "Enviar" após:

Selecionar contatos (100, 1000 ou 10.000)

Criar templates de mensagem (texto, imagem, vídeo)

Definir campaign metadata (nome, público-alvo, criativo)

O frontend não envia nada para Evolution neste momento. Apenas dispara uma ação.

2.2 Etapa 2: Criar Registro de Campanha (Supabase)
A aplicação cria um registro único na tabela campaigns_dispara_lead_saas_02:

Identificação: ID único (UUID gerado automaticamente)

Metadata: Nome da campanha, público-alvo, criativo

Rastreamento: Total de mensagens, contador de enviadas, contador de falhadas

Status: Marcado como "pending" inicialmente

Configurações: Instâncias WhatsApp a usar, delays mínimo e máximo

Auditoria: Quem criou (user_id), quando criou

Este registro é o "guardião" da campanha. Todos os dados importantes ficam aqui.

2.3 Etapa 3: Criar Registros de Mensagens (Supabase)
Para cada combinação de contato + template, criar uma linha na tabela message_logs_dispara_lead_saas_02:

Relacionamento: Cada mensagem aponta para a campanha via campaign_id

Dados da Mensagem: Número de telefone, conteúdo personalizado, instância a usar

Status Inicial: "pending" (não foi enfileirada ainda)

Rastreabilidade: Cada mensagem tem um ID único

Se forem 100 contatos e 1 template = 100 linhas criadas. Se forem 100 contatos e 3 templates = 300 linhas.

2.4 Etapa 4: Enfileirar no QStash
Para cada mensagem criada, chamar QStash passando:

URL de Destino: O endpoint da Edge Function que vai processar

Payload: Dados necessários (número, mensagem, instância, ID da mensagem)

Delay: Aleatoriedade entre as mensagens para não sobrecarregar (3-8 segundos entre cada uma)

Retry: Configurar para tentar até 2 vezes em caso de falha

Metadados: ID da mensagem para rastreabilidade

QStash agora "possui" essa mensagem e garante sua entrega.

2.5 Etapa 5: Marcar Mensagens como Enfileiradas
Após enfileirar com sucesso, atualizar cada mensagem no Supabase:

Status: Muda de "pending" para "queued"

Timestamp: Registra quando foi enfileirada (queued_at)

Isso permite saber qual mensagem já foi enviada para QStash e qual ainda não foi.

2.6 Etapa 6: Atualizar Status da Campanha
Depois que todas as mensagens forem enfileiradas:

Status da Campanha: Muda de "pending" para "processing"

Timestamp: Registra quando começou o processamento

Frontend retorna sucesso para o usuário. A partir deste momento, QStash gerencia tudo.

3. Processamento no QStash
3.1 Como QStash Funciona
QStash armazena a fila e dispara requisições HTTP para seu endpoint de Edge Function. Ele:

Gerencia Concorrência: Envia 4-5 requisições em paralelo por padrão

Respeita Delays: Aguarda o tempo configurado antes de disparar cada requisição

Monitora Falhas: Se uma requisição retornar erro, tenta novamente

Controla Taxa: Não sobrecarrega seu backend com requisições simultâneas demais

3.2 Fluxo dentro do QStash
Recebe a mensagem enfileirada do frontend

Aguarda o delay configurado (ex: 3 segundos)

Faz uma requisição HTTP POST para a Edge Function

Passa todos os dados no body (número, mensagem, instância, etc)

Aguarda resposta

Se sucesso: marca como entregue

Se falha: agenda retry automático (até 2 vezes)

Se falha definitiva: move para "dead letter" (mensagens não processáveis)

4. Processamento na Edge Function
4.1 O Que É a Edge Function
Uma Edge Function é código que roda nos servidores do Supabase (próximo aos usuários, geograficamente). É serverless - você não gerencia servidores.

4.2 Responsabilidades da Edge Function
A função process-message tem tarefas bem definidas:

4.2.1 Receber e Validar
Recebe a requisição do QStash

Valida a assinatura (garante que veio realmente do QStash, não de um atacante)

Parse do JSON para obter dados da mensagem

4.2.2 Chamar Evolution API
Monta a requisição para Evolution API

Passa número de telefone, conteúdo, instância WhatsApp

Aguarda resposta (sucesso ou erro)

4.2.3 Atualizar Banco com Resposta
Este é o ponto crítico. A Edge Function atualiza a mensagem específica no Supabase com a resposta da Evolution:

Status: Muda para "sent" (sucesso) ou "failed" (erro)

Evolution Key: ID que Evolution gerou para rastrear a mensagem

Resposta Completa: Armazena a resposta JSON inteira (para debugging)

Timestamp: Registra exatamente quando foi enviada

Mensagem de Erro: Se falhou, qual foi o erro (número inválido, instância offline, etc)

4.2.4 Atualizar Contadores da Campanha
Incrementar automaticamente:

sent_count se foi sucesso

failed_count se falhou

Isso permite saber em tempo real: "De 100 mensagens, 95 foram, 5 falharam".

Documentação Técnica: Implementação QStash no DisparaLead
1. Visão Geral da Integração QStash
1.1 O Papel do QStash
QStash é um serviço de fila serverless que gerencia o envio assíncrono de mensagens. Ele:

Recebe requisições enfileiradas do frontend

Armazena com confiabilidade garantida

Controla a taxa de envio (rate limiting automático)

Faz retry automático em caso de falha (até 3 tentativas)

Dispara chamadas HTTP para uma Edge Function no momento certo

Fornece visibilidade total via dashboard

1.2 Mudança Arquitetural
Fluxo Anterior:

text
Frontend → Evolution API (direto)
Problemas: Bloqueante, sem retry, risco de timeout, sem escalabilidade
Fluxo com QStash:

text
Frontend → Supabase (salva dados) → QStash (fila) → Edge Function → Evolution API → Supabase (atualiza)
Benefício: Assíncrono, retry automático, escalável, rastreável
2. Arquitetura Técnica
2.1 Componentes Envolvidos
Frontend (Seu App React/Vue):

Coleta dados do usuário

Cria campanha e mensagens no Supabase

Enfileira mensagens no QStash

Não aguarda resposta (não bloqueante)

QStash (Upstash Cloud):

Armazena fila de mensagens

Gerencia timing e delays

Controla concorrência

Faz retries automáticos

Invoca Edge Function via HTTP

Edge Function (Supabase):

Recebe requisição do QStash

Valida assinatura QStash

Chama Evolution API

Atualiza mensagem no Supabase com resultado

Incrementa contadores da campanha

Supabase (Banco + Storage):

Armazena campanhas e mensagens

Serve dados para leitura

Registra resultados de envios

Mantém isolamento multi-tenant

Evolution API (Seu provedor WhatsApp):

Endpoint externo para envio de mensagens

Responde com sucesso/erro

Fornece ID de rastreamento

2.2 Fluxo de Dados
text
1. Frontend insere campanha em campaigns_dispara_lead_saas_02
   ↓
2. Frontend insere 100 mensagens em message_logs_dispara_lead_saas_02 (status: pending)
   ↓
3. Para cada mensagem, chama qstashClient.publish() com payload + delay
   ↓
4. QStash recebe e armazena na fila
   ↓
5. Frontend marca mensagens como "queued" no Supabase
   ↓
6. QStash aguarda delay e dispara HTTP POST para Edge Function
   ↓
7. Edge Function recebe, valida, chama Evolution API
   ↓
8. Edge Function atualiza message_logs_dispara_lead_saas_02 com resultado (sent/failed)
   ↓
9. Edge Function incrementa contadores em campaigns_dispara_lead_saas_02
   ↓
10. Resultado persistido: mensagem e campanha com dados completos
3. Requisitos de Banco de Dados
3.1 Tabelas que Precisam Existir
campaigns_dispara_lead_saas_02 (CRIAR NOVA):

Master record de campanhas

Rastreia status, contadores, configurações

Uma por campanha disparada

message_logs_dispara_lead_saas_02 (JÁ EXISTE, ADICIONAR CAMPOS):

Registros individuais de mensagens

Uma linha por mensagem

Será atualizada pela Edge Function

3.2 Colunas Necessárias em campaigns_dispara_lead_saas_02
Tabela nova com os seguintes campos:

Campo	Tipo	Descrição
id	UUID	Primary key
tenant_id	UUID	Multi-tenancy
user_id	UUID	Quem criou (referencia auth.users)
name	TEXT	Nome da campanha
target_audience	TEXT	Público-alvo
creative	TEXT	Descrição do criativo
status	TEXT	pending, processing, completed, failed
total_messages	INTEGER	Quantas mensagens ao todo
sent_count	INTEGER	Já enviadas
failed_count	INTEGER	Já falhadas
instances	TEXT[]	Array de instâncias WhatsApp
delay_min	INTEGER	Delay mínimo (segundos)
delay_max	INTEGER	Delay máximo (segundos)
is_scheduled	BOOLEAN	Se é agendada
scheduled_for	TIMESTAMPTZ	Data/hora agendamento
created_at	TIMESTAMPTZ	Criação
updated_at	TIMESTAMPTZ	Última atualização
started_at	TIMESTAMPTZ	Quando começou
completed_at	TIMESTAMPTZ	Quando terminou
Foreign Keys:

tenant_id → tenants_dispara_lead_saas_02(id)

user_id → auth.users(id)

3.3 Colunas Necessárias em message_logs_dispara_lead_saas_02
Adicionar aos campos já existentes:

Campo	Tipo	Descrição
campaign_id	UUID	Referência para campaigns (FK)
instance_name	TEXT	Qual instância usou
status	TEXT	pending, queued, sent, failed
evolution_key	TEXT	ID que Evolution gerou
evolution_response	JSONB	Resposta completa da Evolution
error_message	TEXT	Se falhou, qual o erro
queued_at	TIMESTAMPTZ	Quando foi enfileirada
sent_at	TIMESTAMPTZ	Quando foi enviada
retry_count	INTEGER	Quantas vezes retentou
Foreign Key:

campaign_id → campaigns_dispara_lead_saas_02(id) ON DELETE CASCADE

Índices Críticos:

(campaign_id) - Para filtrar mensagens de uma campanha

(status) - Para filtrar por estado

(tenant_id) - Para isolamento multi-tenant

(campaign_id, status) - Para queries combinadas

4. Configuração QStash
4.1 Credenciais Necessárias
Você precisa obter do Upstash:

QSTASH_TOKEN - Token de autenticação para chamar QStash

Usado pelo frontend para enfileirar mensagens

Armazenar em .env.local (public, pode expor via frontend)

QSTASH_CURRENT_SIGNING_KEY - Chave para validar assinatura de webhooks

Usado pela Edge Function para validar que requisição veio do QStash

Armazenar em Supabase Secrets (não expor)

4.2 Setup Upstash
Ir para https://console.upstash.com

Criar conta se necessário

Navegar para QStash

Copiar QSTASH_TOKEN

Copiar QSTASH_CURRENT_SIGNING_KEY

4.3 Configurar Variáveis de Ambiente
Frontend (.env.local):

text
VITE_QSTASH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Supabase (Project Settings → Secrets):

text
QSTASH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
QSTASH_CURRENT_SIGNING_KEY=wsxxxx...
EVOLUTION_API_URL=https://api.bflabs.com.br
EVOLUTION_API_KEY=9a38befe6a9f6938cd70cb769c66357d
5. Implementação Frontend
5.1 Instalar SDK QStash
bash
npm install @upstash/qstash
5.2 Criar Serviço QStash
Arquivo: src/services/qstashClient.ts

Responsabilidades:

Instanciar cliente QStash com token

Expor função para enfileirar mensagens

Expor função para enfileirar em batch

Funcionalidades:

enqueueMessage() - Enfileira uma mensagem individual

enqueueBatchMessages() - Enfileira múltiplas mensagens

Ambas aceitam delay, retry count, e agendamento opcional

5.3 Modificar disparadorStore.ts
Função: sendMessages()

O que faz:

Obter tenant_id do usuário logado

Criar registro em campaigns_dispara_lead_saas_02

Para cada contato + template:

Personalizar mensagem ({nome} → João)

Criar linha em message_logs_dispara_lead_saas_02

Para cada mensagem criada:

Calcular delay aleatório entre tempoMin e tempoMax

Chamar qstashClient.enqueueMessage()

Bulk update: marcar todas como "queued"

Atualizar campanha: status = "processing"

Retornar sucesso imediato (não aguarda envio)

Parametros esperados:

contatos: Array com telefone, nome, empresa, etc

instances: Array de instâncias WhatsApp

templates: Array com tipo, conteúdo, mídia

campaignName, publicTarget, content: Metadados

tempoMin, tempoMax: Delays em segundos

Fluxo não-bloqueante:

Frontend retorna sucesso em segundos

QStash cuida do envio nos minutos seguintes

Usuário pode navegar/fazer outra coisa

6. Implementação Edge Function
6.1 Criar Function no Supabase
Nome: process-message

Runtime: Deno/TypeScript

Tipo: HTTP

6.2 Responsabilidades da Function
Entrada
Recebe HTTP POST do QStash

Body contém: message_id, phone_number, message_content, instance_name, campaign_id

Headers contém: Upstash-Signature para validação

Validação
Ler header Upstash-Signature

Validar assinatura contra QSTASH_CURRENT_SIGNING_KEY

Se inválida, rejeitar (status 401)

Parse JSON do body

Processamento
Buscar dados adicionais se necessário

Montar requisição para Evolution API

Chamar Evolution com: número, mensagem, delay (1200ms), instância

Persistência
Atualizar message_logs_dispara_lead_saas_02 com resultado

Se sucesso: status="sent", evolution_key, evolution_response, sent_at

Se erro: status="failed", error_message, evolution_response, sent_at

Chamar RPC function para incrementar contador de campanha

Se sucesso: increment_campaign_sent_count

Se erro: increment_campaign_failed_count

Saída
Se sucesso: Retornar HTTP 200 com { success: true, message_id, evolution_key }

Se erro: Retornar HTTP 400 ou throw error (QStash fará retry)

QStash decide se retenta baseado no status HTTP

7. RPC Functions Necessárias
7.1 increment_campaign_sent_count
Input: campaign_id (UUID)

Ação:

Incrementa sent_count em 1

Atualiza updated_at com NOW()

Executa atomicamente (sem race condition)

Uso: Chamada da Edge Function quando mensagem é enviada com sucesso

7.2 increment_campaign_failed_count
Input: campaign_id (UUID)

Ação:

Incrementa failed_count em 1

Atualiza updated_at com NOW()

Executa atomicamente

Uso: Chamada da Edge Function quando mensagem falha

7.3 Por Que RPC Functions?
Se múltiplas Edge Functions rodam em paralelo, elas podem sobrescrever dados:

text
Sem RPC:
- Função A lê sent_count=5, incrementa, salva 6
- Função B lê sent_count=5, incrementa, salva 6 (deveria ser 7!)

Com RPC:
- Função A e B chamam RPC atomicamente
- Resultado garante sent_count=7
8. Fluxo Completo de Envio
8.1 Pré-Condições
Usuário autenticado em Supabase

Contatos selecionados (array com telefone, nome, empresa)

Templates criados (array com tipo, conteúdo, mídia)

Instâncias WhatsApp conectadas

8.2 Passos
Passo 1: Frontend Cria Campanha

INSERT em campaigns_dispara_lead_saas_02

Retorna campaign_id

Campos: name, target_audience, creative, instances, delay_min, delay_max, total_messages, status="pending"

Passo 2: Frontend Cria Mensagens

Loop: para cada contato × template

Personaliza mensagem ({nome} → João Silva)

INSERT em message_logs_dispara_lead_saas_02 com status="pending"

Retorna array de message_ids (100 para 100 contatos × 1 template)

Passo 3: Frontend Enfileira no QStash

Loop: para cada message_id

Calcula delay aleatório (ex: 4 segundos)

Chama qstashClient.publish({
url: https://seu-projeto.supabase.co/functions/v1/process-message,
body: {message_id, phone_number, message_content, instance_name, campaign_id},
delay: "4s",
retries: 2
})

QStash confirma recebimento

Passo 4: Frontend Atualiza Banco

UPDATE message_logs_dispara_lead_saas_02

SET status="queued", queued_at=NOW()

UPDATE campaigns_dispara_lead_saas_02

SET status="processing", started_at=NOW()

Passo 5: Frontend Retorna Sucesso

Mostra notificação: "100 mensagens enfileiradas!"

Navega para página de logs

UI liberado para interação

Passo 6: QStash Aguarda e Dispara

Aguarda delay (4 segundos na primeira mensagem)

Faz HTTP POST para Edge Function

Passa payload no body + header Upstash-Signature

Passo 7: Edge Function Processa

Valida assinatura QStash

Parse payload

Chama Evolution API com número e mensagem

Evolution retorna: sucesso ou erro

Passo 8: Edge Function Persiste

UPDATE message_logs_dispara_lead_saas_02 com resultado

RPC increment_campaign_sent_count ou increment_campaign_failed_count

Retorna sucesso/erro para QStash

Passo 9: QStash Continua Fila

Se Edge Function retornou 200: marca como delivered

Se retornou erro: agenda retry (até 2 vezes)

Passa para próxima mensagem

Passo 10: Resultado Final

Após ~2-5 minutos: todas as 100 mensagens processadas

message_logs: 95 com status="sent", 5 com status="failed"

campaigns: sent_count=95, failed_count=5

9. Considerações de Implementação
9.1 Personalização de Mensagens
Quando fazer: No frontend, antes de criar message_logs

Template original: "Olá {nome}, bem-vindo à {empresa}!"

Para cada contato: Substituir {nome} → João, {empresa} → Acme Inc

Resultado armazenado em message_logs.message_content: "Olá João, bem-vindo à Acme Inc!"

Por quê: Edge Function não precisa fazer personalização, apenas enviar

9.2 Delays e Rate Limiting
QStash permite configurar:

delay: Tempo de espera antes de disparar (ex: 4s)

Concorrência: Quantas requisições em paralelo (default 4-5)

Seu use case:

delay_min=3, delay_max=8: Cada mensagem tem delay próprio

QStash respeita isso: não sobrecarga Evolution API

Resultado:

100 mensagens em 8 minutos (~1 msg/5s)

Evolution API nunca recebe spike de 100 requisições simultâneas

9.3 Retry Logic
QStash automático:

Se Edge Function retorna erro (status 400+), tenta novamente

Total de tentativas: retries=2 significa 1 original + 2 retries = 3 tentativas

Backoff exponencial: 1º retry após 5s, 2º retry após 30s

Edge Function:

Se Evolution retorna erro transitório (ex: timeout), throw error

QStash fará retry

Se erro permanente (ex: número inválido), atualiza message como "failed"

Retorna sucesso (200) para QStash não fazer mais retry

9.4 Isolamento Multi-Tenant
Cada tabela tem tenant_id:

campaigns_dispara_lead_saas_02.tenant_id

message_logs_dispara_lead_saas_02.tenant_id

Regra:

Sempre filtrar por tenant_id nas queries

Edge Function valida que message.tenant_id == campaign.tenant_id

Previne vazamento de dados entre clientes

9.5 Monitoramento e Logs
QStash Dashboard:

https://console.upstash.com/qstash

Ver mensagens published, delivered, failed

Verificar payloads e respostas

Supabase Logs:

Console → Functions → process-message → Logs

Ver cada invocação da Edge Function

Debug de erros

Supabase Data:

Consultar message_logs para ver status final

Consultar campaigns para ver contadores

Analytics: taxa de sucesso, erros mais comuns