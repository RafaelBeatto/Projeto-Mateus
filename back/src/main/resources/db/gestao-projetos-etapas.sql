-- =====================================================================
-- ATUALIZAÇÃO: etapas da Gestão de Projetos, para um banco que já rodou gestao-projetos.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-etapas.sql
-- =====================================================================

BEGIN;

-- Etapas de cada projeto (Kanban dentro do projeto)
CREATE TABLE gestao_projetos.projeto_etapa (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id      BIGINT        NOT NULL REFERENCES gestao_projetos.projeto (id) ON DELETE CASCADE,
    titulo          VARCHAR(200)  NOT NULL,
    descricao       VARCHAR(2000),
    status          VARCHAR(15)   NOT NULL DEFAULT 'EM_ESPERA'
                    CHECK (status IN ('EM_ESPERA','EM_PAUSA','EM_ANDAMENTO','CONCLUIDO')),
    responsavel_id  BIGINT        REFERENCES acesso.usuario (id),
    prazo           DATE,
    criado_em       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_gestao_projeto_etapa_projeto ON gestao_projetos.projeto_etapa (projeto_id);

COMMIT;
