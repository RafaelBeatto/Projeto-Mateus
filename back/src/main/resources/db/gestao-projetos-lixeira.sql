-- =====================================================================
-- ATUALIZAÇÃO: lixeira dos projetos da Gestão de Projetos,
-- para um banco que já rodou gestao-projetos-arquivados.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-lixeira.sql
-- excluido_em nulo = fora da lixeira; preenchido = na lixeira
-- (restaurável até ser excluído de vez).
-- =====================================================================

BEGIN;

ALTER TABLE gestao_projetos.projeto ADD COLUMN excluido_em TIMESTAMPTZ;

COMMIT;
