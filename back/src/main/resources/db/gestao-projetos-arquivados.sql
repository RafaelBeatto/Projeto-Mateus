-- =====================================================================
-- ATUALIZAÇÃO: arquivar projetos da Gestão de Projetos,
-- para um banco que já rodou gestao-projetos.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-arquivados.sql
-- arquivado_em nulo = projeto ativo (aparece no Kanban);
-- preenchido = arquivado (aparece só em "Arquivados").
-- =====================================================================

BEGIN;

ALTER TABLE gestao_projetos.projeto ADD COLUMN arquivado_em TIMESTAMPTZ;

COMMIT;
