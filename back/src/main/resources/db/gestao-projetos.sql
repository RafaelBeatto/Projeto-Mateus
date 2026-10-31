-- =====================================================================
-- ATUALIZAÇÃO: módulo Gestão de Projetos, para um banco criado antes dele.
-- (Num banco novo não precisa: o apae.sql já inclui tudo.)
--   psql -U postgres -d apae -f gestao-projetos.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 13. GESTÃO DE PROJETOS (independente de PROJETOS): projetos no Kanban
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS gestao_projetos;

CREATE TABLE gestao_projetos.projeto (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidade_id       BIGINT         NOT NULL REFERENCES acesso.unidade (id),
    nome             VARCHAR(200)   NOT NULL,
    processo         VARCHAR(40),
    contratante      VARCHAR(200),
    status           VARCHAR(15)    NOT NULL DEFAULT 'EM_ESPERA'
                     CHECK (status IN ('EM_ESPERA','EM_PAUSA','EM_ANDAMENTO','EM_ANALISE')),
    -- Nula = "Nada"
    prioridade       VARCHAR(10)    CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','URGENTE')),
    data_inicio      DATE           NOT NULL,
    data_fim         DATE,
    convenio_origem  VARCHAR(150),
    convenio_numero  VARCHAR(40),
    valor_convenio   NUMERIC(14,2)  CHECK (valor_convenio >= 0),
    contrapartida    NUMERIC(14,2)  CHECK (contrapartida >= 0),
    origem_recurso   VARCHAR(250),
    criado_por_id    BIGINT         REFERENCES acesso.usuario (id),
    criado_em        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_gestao_projeto_periodo CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
CREATE INDEX ix_gestao_projeto_unidade ON gestao_projetos.projeto (unidade_id, status);

CREATE TABLE gestao_projetos.projeto_coordenador (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    projeto_id  BIGINT       NOT NULL REFERENCES gestao_projetos.projeto (id) ON DELETE CASCADE,
    usuario_id  BIGINT       NOT NULL REFERENCES acesso.usuario (id),
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_gestao_projeto_coordenador UNIQUE (projeto_id, usuario_id)
);
CREATE INDEX ix_gestao_projeto_coordenador_usuario ON gestao_projetos.projeto_coordenador (usuario_id);

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

-- Gestão de Projetos: permissões e matriz padrão
INSERT INTO acesso.permissao (id, codigo, modulo, descricao) VALUES
    (28, 'GESTAO_PROJETO_LER',      'GESTAO_PROJETOS', 'Ver os projetos e o Kanban da Gestão de Projetos'),
    (29, 'GESTAO_PROJETO_ESCREVER', 'GESTAO_PROJETOS', 'Criar, editar, mover e excluir projetos da Gestão de Projetos');

INSERT INTO acesso.cargo_permissao (cargo_id, permissao_id)
SELECT c.id, p.id
  FROM acesso.cargo c
  JOIN acesso.permissao p ON p.codigo = ANY (CASE c.codigo
    WHEN 'PRESIDENTE'    THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER']
    WHEN 'DIRETOR'       THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER']
    WHEN 'ADMINISTRADOR' THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER']
    WHEN 'SECRETARIO'    THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER']
    WHEN 'TESOUREIRO'    THEN ARRAY['GESTAO_PROJETO_LER']
    ELSE ARRAY[]::varchar[]
  END);

COMMIT;
