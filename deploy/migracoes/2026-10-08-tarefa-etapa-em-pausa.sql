-- =====================================================================
-- Migração de produção: tarefa da etapa (Gestão de Projetos) ganha o status "Em pausa".
-- Rodar depois de 2026-10-08-status-tarefa-etapa.sql. Pode rodar de novo sem problema.
-- Rodar como dono do banco:  psql -d apae -c "SET ROLE apae;" -f este-arquivo.sql
-- =====================================================================
BEGIN;

ALTER TABLE gestao_projetos.etapa_tarefa DROP CONSTRAINT IF EXISTS etapa_tarefa_status_check;
ALTER TABLE gestao_projetos.etapa_tarefa ADD CONSTRAINT etapa_tarefa_status_check
    CHECK (status IN ('EM_ESPERA', 'EM_PAUSA', 'EM_ANDAMENTO', 'CONCLUIDA'));

COMMIT;
