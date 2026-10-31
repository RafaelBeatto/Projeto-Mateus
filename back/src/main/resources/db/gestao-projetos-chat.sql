-- =====================================================================
-- ATUALIZAÇÃO: chat de cada projeto da Gestão de Projetos, para um banco que já rodou
-- gestao-projetos.sql e gestao-projetos-etapas.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos-chat.sql
-- =====================================================================

BEGIN;

-- Chat de cada projeto (conversa em grupo, uma por projeto)
CREATE TABLE gestao_projetos.projeto_mensagem (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id    BIGINT         NOT NULL REFERENCES gestao_projetos.projeto (id) ON DELETE CASCADE,
    remetente_id  BIGINT         NOT NULL REFERENCES acesso.usuario (id),
    texto         VARCHAR(2000)  NOT NULL,
    enviada_em    TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX ix_gestao_projeto_mensagem_projeto ON gestao_projetos.projeto_mensagem (projeto_id, id);

COMMIT;
