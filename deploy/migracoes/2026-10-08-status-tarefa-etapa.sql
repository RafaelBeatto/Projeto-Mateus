-- =====================================================================
-- Migração de produção: Status das tarefas das etapas (Gestão de Projetos).
-- Só acrescenta; pode rodar de novo sem duplicar nada.
-- Rodar como dono do banco:  psql -d apae -c "SET ROLE apae;" -f este-arquivo.sql
-- =====================================================================
BEGIN;

ALTER TABLE gestao_projetos.etapa_tarefa
    ADD COLUMN IF NOT EXISTS status VARCHAR(15) NOT NULL DEFAULT 'NAO_INICIADA'
        CHECK (status IN ('NAO_INICIADA','EM_ANDAMENTO','AGUARDANDO','BLOQUEADA'));

COMMIT;
