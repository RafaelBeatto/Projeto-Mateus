-- =====================================================================
-- ATUALIZAÇÃO: lista de tarefas das etapas da Gestão de Projetos (com dependências),
-- para um banco que já rodou gestao-projetos-etapas.sql.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
-- Pode rodar de novo: se a tabela já existir (versão anterior), só ganha as colunas novas.
--   psql -U postgres -d apae -f gestao-projetos-etapa-tarefas.sql
-- =====================================================================

BEGIN;

-- Lista de tarefas (checklist) de cada etapa
CREATE TABLE IF NOT EXISTS gestao_projetos.etapa_tarefa (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    etapa_id        BIGINT        NOT NULL REFERENCES gestao_projetos.projeto_etapa (id) ON DELETE CASCADE,
    texto           VARCHAR(200)  NOT NULL,
    feita           BOOLEAN       NOT NULL DEFAULT FALSE,
    ordem           SMALLINT      NOT NULL DEFAULT 0,
    prazo           DATE,
    responsavel_id  BIGINT        REFERENCES acesso.usuario (id)
);
CREATE INDEX IF NOT EXISTS ix_gestao_etapa_tarefa_etapa ON gestao_projetos.etapa_tarefa (etapa_id);

-- Prazo e responsável de cada tarefa (para quem já tinha criado a tabela antes)
ALTER TABLE gestao_projetos.etapa_tarefa
    ADD COLUMN IF NOT EXISTS prazo DATE,
    ADD COLUMN IF NOT EXISTS responsavel_id BIGINT REFERENCES acesso.usuario (id);

-- Dependências entre tarefas (de qualquer etapa do mesmo projeto): a tarefa só pode ser concluída depois das que ela depende
CREATE TABLE IF NOT EXISTS gestao_projetos.etapa_tarefa_dependencia (
    tarefa_id      BIGINT  NOT NULL REFERENCES gestao_projetos.etapa_tarefa (id) ON DELETE CASCADE,
    depende_de_id  BIGINT  NOT NULL REFERENCES gestao_projetos.etapa_tarefa (id) ON DELETE CASCADE,
    PRIMARY KEY (tarefa_id, depende_de_id),
    CHECK (tarefa_id <> depende_de_id)
);
CREATE INDEX IF NOT EXISTS ix_gestao_etapa_tarefa_dependencia_dep ON gestao_projetos.etapa_tarefa_dependencia (depende_de_id);

-- Dependência de uma etapa inteira (do mesmo projeto): a tarefa só pode ser concluída quando a etapa estiver Concluída
CREATE TABLE IF NOT EXISTS gestao_projetos.etapa_tarefa_dependencia_etapa (
    tarefa_id  BIGINT  NOT NULL REFERENCES gestao_projetos.etapa_tarefa (id) ON DELETE CASCADE,
    etapa_id   BIGINT  NOT NULL REFERENCES gestao_projetos.projeto_etapa (id) ON DELETE CASCADE,
    PRIMARY KEY (tarefa_id, etapa_id)
);
CREATE INDEX IF NOT EXISTS ix_gestao_etapa_tarefa_dependencia_etapa ON gestao_projetos.etapa_tarefa_dependencia_etapa (etapa_id);

COMMIT;
