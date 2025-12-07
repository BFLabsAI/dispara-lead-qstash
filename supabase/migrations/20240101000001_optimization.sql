-- Supabase Database Optimization Script
-- Run this in your Supabase SQL Editor to optimize the disparador_r7_treinamentos table

-- 1. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_disparador_created_at ON disparador_r7_treinamentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disparador_instancia ON disparador_r7_treinamentos(instancia);
CREATE INDEX IF NOT EXISTS idx_disparador_tipo_envio ON disparador_r7_treinamentos(tipo_envio);
CREATE INDEX IF NOT EXISTS idx_disparador_nome_campanha ON disparador_r7_treinamentos(nome_campanha);
CREATE INDEX IF NOT EXISTS idx_disparador_usar_ia ON disparador_r7_treinamentos(usaria);

-- 2. Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_disparador_dashboard_query ON disparador_r7_treinamentos(created_at DESC, instancia, tipo_envio);

-- 3. Index for date range queries
CREATE INDEX IF NOT EXISTS idx_disparador_date_range ON disparador_r7_treinamentos(created_at);

-- 4. Update table statistics for better query planning
ANALYZE disparador_r7_treinamentos;

-- 5. Set appropriate row-level security policies (if not already set)
-- Note: Adjust these policies based on your authentication requirements

-- Example RLS policies (uncomment and modify as needed)
/*
ALTER TABLE disparador_r7_treinamentos ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own data based on some user_id field
CREATE POLICY "Users can view their own disparador data" ON disparador_r7_treinamentos
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Allow service role to access all data
CREATE POLICY "Service role can access all data" ON disparador_r7_treinamentos
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
*/

-- 6. Consider partitioning for very large tables (uncomment if table grows beyond 10M rows)
/*
-- Create a partitioned table for better performance with large datasets
CREATE TABLE disparador_r7_treinamentos_partitioned (
    LIKE disparador_r7_treinamentos INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE disparador_r7_treinamentos_y2024m01 PARTITION OF disparador_r7_treinamentos_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE disparador_r7_treinamentos_y2024m02 PARTITION OF disparador_r7_treinamentos_partitioned
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
*/

-- 7. Create a materialized view for dashboard statistics (updated daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_disparador_daily_stats AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_envios,
    COUNT(*) FILTER (WHERE tipo_envio = 'sucesso') as envios_sucesso,
    COUNT(*) FILTER (WHERE tipo_envio != 'sucesso') as envios_falha,
    COUNT(*) FILTER (WHERE usaria = true) as envios_com_ia,
    COUNT(DISTINCT instancia) as instancias_unicas,
    COUNT(DISTINCT nome_campanha) as campanhas_unicas
FROM disparador_r7_treinamentos
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create a unique index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_disparador_daily_stats_date ON mv_disparador_daily_stats(date);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_daily_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_disparador_daily_stats;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a scheduled job to refresh the stats (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled in your Supabase project
/*
SELECT cron.schedule(
    'refresh-daily-stats',
    '0 2 * * *', -- 2 AM daily
    'SELECT refresh_daily_stats();'
);
*/

-- 9. Add table comment for documentation
COMMENT ON TABLE disparador_r7_treinamentos IS 'WhatsApp message dispatch records with AI integration and campaign tracking';

-- 10. Add column comments
COMMENT ON COLUMN disparador_r7_treinamentos.numero IS 'Recipient phone number';
COMMENT ON COLUMN disparador_r7_treinamentos.tipo_envio IS 'Message status (sucesso/falha/processando)';
COMMENT ON COLUMN disparador_r7_treinamentos.usaria IS 'Whether AI was used for message generation';
COMMENT ON COLUMN disparador_r7_treinamentos.instancia IS 'WhatsApp instance identifier';
COMMENT ON COLUMN disparador_r7_treinamentos.texto IS 'Message content';
COMMENT ON COLUMN disparador_r7_treinamentos.nome_campanha IS 'Campaign name';
COMMENT ON COLUMN disparador_r7_treinamentos.publico IS 'Target audience segment';
COMMENT ON COLUMN disparador_r7_treinamentos.criativo IS 'Creative/template used';
COMMENT ON COLUMN disparador_r7_treinamentos.tipo_campanha IS 'Campaign type (agendada/pontual)';

-- 11. Performance monitoring query
-- Run this periodically to check index usage and table performance
/*
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'disparador_r7_treinamentos'
ORDER BY attname;

-- Check slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%disparador_r7_treinamentos%'
ORDER BY total_time DESC
LIMIT 10;
*/