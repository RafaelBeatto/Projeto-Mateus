-- =====================================================================
-- Migração de produção: ramificações das etapas (mapa da Gestão de Projetos).
-- Cada etapa pode sair de outra etapa do mesmo projeto (nula = direto do projeto).
-- Só acrescenta; pode rodar de novo sem duplicar nada.
-- Rodar como dono do banco:  psql -d apae -c "SET ROLE apae;" -f este-arquivo.sql
-- =====================================================================
BEGIN;

ALTER TABLE gestao_projetos.projeto_etapa
    ADD COLUMN IF NOT EXISTS etapa_pai_id BIGINT REFERENCES gestao_projetos.projeto_etapa (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_gestao_projeto_etapa_pai ON gestao_projetos.projeto_etapa (etapa_pai_id);

COMMIT;
