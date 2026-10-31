-- =====================================================================
-- ATUALIZAÇÃO: status das tarefas das etapas passa a ser só
-- Em espera, Em andamento e Concluída (Concluída = marcada como feita).
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-status-tarefa.sql
-- Não iniciada, Aguardando e Bloqueada viram Em espera;
-- toda tarefa já marcada como feita vira Concluída.
-- =====================================================================

BEGIN;

ALTER TABLE gestao_projetos.etapa_tarefa DROP CONSTRAINT IF EXISTS etapa_tarefa_status_check;

UPDATE gestao_projetos.etapa_tarefa SET status = 'EM_ESPERA'
 WHERE status IN ('NAO_INICIADA', 'AGUARDANDO', 'BLOQUEADA');
UPDATE gestao_projetos.etapa_tarefa SET status = 'CONCLUIDA' WHERE feita;
UPDATE gestao_projetos.etapa_tarefa SET status = 'EM_ESPERA' WHERE NOT feita AND status = 'CONCLUIDA';

ALTER TABLE gestao_projetos.etapa_tarefa ALTER COLUMN status SET DEFAULT 'EM_ESPERA';
ALTER TABLE gestao_projetos.etapa_tarefa ADD CONSTRAINT etapa_tarefa_status_check
    CHECK (status IN ('EM_ESPERA', 'EM_ANDAMENTO', 'CONCLUIDA'));

COMMIT;
