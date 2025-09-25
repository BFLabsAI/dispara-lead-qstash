create table public.scheduled_campaigns (
  id uuid not null default gen_random_uuid () primary key,
  campaign_group_id uuid not null default gen_random_uuid (), -- Novo: Para agrupar disparos da mesma campanha
  nome_campanha text not null,
  publico_alvo text null,
  criativo_campanha text null,
  hora_agendamento timestamp with time zone not null, -- Data e hora para ESTE disparo específico
  dispatch_order integer not null default 1, -- Novo: Ordem deste disparo dentro do grupo (1º, 2º, etc.)
  status_disparo text not null default 'agendado', -- Novo: 'agendado', 'processando', 'concluido', 'falha', 'cancelado'
  instancias_selecionadas text[] not null,
  templates_mensagem jsonb not null, -- Mensagens para ESTE disparo específico
  usar_ia boolean not null,
  tempo_min_intervalo integer not null,
  tempo_max_intervalo integer not null,
  contatos_json jsonb not null, -- A lista de contatos para ESTE disparo
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  processed_at timestamp with time zone null, -- Quando o n8n começou a processar ESTE disparo
  completed_at timestamp with time zone null, -- Quando o n8n concluiu ESTE disparo
  error_details text null -- Para registrar erros a nível de ESTE disparo
);