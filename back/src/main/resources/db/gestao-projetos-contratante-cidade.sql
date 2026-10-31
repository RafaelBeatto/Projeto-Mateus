-- =====================================================================
-- ATUALIZAÇÃO: cidade do contratante nos projetos da Gestão de Projetos,
-- para um banco que já rodou gestao-projetos.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-contratante-cidade.sql
-- Projetos antigos com contratante ficam sem cidade até a próxima edição,
-- quando o formulário passa a exigi-la.
-- =====================================================================

BEGIN;

ALTER TABLE gestao_projetos.projeto ADD COLUMN contratante_cidade VARCHAR(100);

COMMIT;
