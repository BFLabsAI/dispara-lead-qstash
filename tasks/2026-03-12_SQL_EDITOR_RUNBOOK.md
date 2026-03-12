# Runbook SQL Editor

**Data:** 2026-03-12  
**Projeto:** DisparaLead  
**Objetivo:** aplicar manualmente no SQL Editor as mudanças necessárias sem depender de `supabase db pull`

---

## Ordem de execução

1. validar se a RPC já existe
2. criar ou atualizar a RPC de completion atômico
3. criar os índices de `message_logs`
4. validar se a RPC e os índices existem
5. depois fazer deploy das functions no terminal

---

## 1. Validar se a RPC já existe

Rode primeiro:

```sql
select
  proname,
  pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname = 'complete_campaign_if_finished';
```

Se aparecer a função, você ainda pode rodar o bloco `CREATE OR REPLACE FUNCTION` abaixo sem problema.

---

## 2. Criar ou atualizar a RPC de completion atômico

```sql
CREATE OR REPLACE FUNCTION public.complete_campaign_if_finished(
  p_campaign_id uuid,
  p_current_message_id uuid,
  p_completed_at timestamp with time zone DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pending_count integer;
  v_updated_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_pending_count
  FROM public.message_logs_dispara_lead_saas_03
  WHERE campaign_id = p_campaign_id
    AND id <> p_current_message_id
    AND status IN ('queued', 'pending');

  IF v_pending_count > 0 THEN
    RETURN false;
  END IF;

  UPDATE public.campaigns_dispara_lead_saas_02
  SET completed_at = p_completed_at,
      status = 'completed',
      updated_at = now()
  WHERE id = p_campaign_id
    AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count > 0;
END;
$function$;
```

O que essa RPC faz:
- verifica se ainda existe outra mensagem `queued` ou `pending` na campanha
- se não existir, marca a campanha como `completed`
- retorna `true` só para a execução que realmente conseguiu fazer o completion

---

## 3. Criar os índices de baixo risco para dashboard/logs

```sql
CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_status_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_logs_tenant_campaign_created_at_desc
ON public.message_logs_dispara_lead_saas_03 (tenant_id, campaign_name, created_at DESC)
WHERE campaign_name IS NOT NULL;
```

O que esses índices melhoram:
- consultas de dashboard por `tenant + data`
- consultas de logs por `tenant + status + data`
- consultas por campanha dentro do tenant

---

## 4. Validar se tudo foi criado

### Validar RPC

```sql
select
  proname,
  pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname = 'complete_campaign_if_finished';
```

### Validar índices

```sql
select
  schemaname,
  tablename,
  indexname
from pg_indexes
where tablename = 'message_logs_dispara_lead_saas_03'
  and indexname in (
    'idx_message_logs_tenant_created_at_desc',
    'idx_message_logs_tenant_status_created_at_desc',
    'idx_message_logs_tenant_campaign_created_at_desc'
  )
order by indexname;
```

---

## 5. Deploy das functions no terminal

Depois de aplicar e validar a SQL acima:

```bash
supabase functions deploy process-message
supabase functions deploy process-message-ai
```

Se quiser redeployar também a function de enqueue:

```bash
supabase functions deploy enqueue-campaign
```

---

## 6. Validação pós-deploy

Validar no app:

1. campanha pequena concluindo normalmente
2. nenhuma duplicidade de notificação de completion
3. dashboard carregando com janela padrão de `7 dias`
4. logs paginados funcionando

---

## Observações

- este runbook evita Docker
- `CREATE OR REPLACE FUNCTION` é seguro para reaplicar
- os índices usam `IF NOT EXISTS`, então não quebram se já existirem
- se algo falhar no SQL Editor, pare antes do deploy das functions
