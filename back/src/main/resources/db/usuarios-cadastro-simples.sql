-- =====================================================================
-- ATUALIZAÇÃO: cadastro de usuário simplificado, para um banco que já existia.
-- Num banco novo não precisa: o apae.sql já está assim.
--   psql -U postgres -d apae -f usuarios-cadastro-simples.sql
--
-- 1) Usuário: entra "Função" (texto livre); saem sobrenome, telefone, e-mail
--    e data de nascimento. O sobrenome é juntado ao nome antes de sair.
--    ATENÇÃO: telefone, e-mail e data de nascimento dos usuários são apagados.
-- 2) Cargos: ficam só Administrador, Coordenador, Responsável e Prestador de
--    serviço (além do Administrador do sistema, que não aparece para escolha).
--      Presidente -> Administrador        Diretor    -> Coordenador
--      Secretário -> Responsável          Tesoureiro -> Prestador de serviço
--    As permissões desses cargos voltam ao padrão novo (ajustes das unidades são descartados).
-- =====================================================================

BEGIN;

-- 1) Usuário
ALTER TABLE acesso.usuario ADD COLUMN IF NOT EXISTS funcao VARCHAR(80);
ALTER TABLE acesso.usuario ALTER COLUMN nome TYPE VARCHAR(160);
UPDATE acesso.usuario SET nome = trim(nome || ' ' || coalesce(sobrenome, ''));
ALTER TABLE acesso.usuario
    DROP COLUMN sobrenome,
    DROP COLUMN telefone,
    DROP COLUMN email,
    DROP COLUMN data_nascimento;

-- 2) Cargos: Presidente (2) sai; quem era Presidente vira Administrador (4).
UPDATE acesso.usuario SET cargo_id = 4 WHERE cargo_id = 2;
DELETE FROM acesso.unidade_cargo_permissao WHERE cargo_id IN (2, 3, 4, 5, 6);
DELETE FROM acesso.cargo_permissao WHERE cargo_id IN (2, 3, 4, 5, 6);
DELETE FROM acesso.cargo WHERE id = 2;

UPDATE acesso.cargo SET codigo = 'ADMINISTRADOR',     nome = 'Administrador',        nivel = 1 WHERE id = 4;
UPDATE acesso.cargo SET codigo = 'COORDENADOR',       nome = 'Coordenador',          nivel = 2 WHERE id = 3;
UPDATE acesso.cargo SET codigo = 'RESPONSAVEL',       nome = 'Responsável',          nivel = 3 WHERE id = 5;
UPDATE acesso.cargo SET codigo = 'PRESTADOR_SERVICO', nome = 'Prestador de serviço', nivel = 4 WHERE id = 6;

INSERT INTO acesso.cargo_permissao (cargo_id, permissao_id)
SELECT c.id, p.id
  FROM acesso.cargo c
  JOIN acesso.permissao p ON p.codigo = ANY (CASE c.codigo
    WHEN 'ADMINISTRADOR' THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER','EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER',
                                    'USUARIO_LER','USUARIO_ESCREVER','UNIDADE_LER','UNIDADE_ESCREVER','PERMISSAO_LER','PERMISSAO_ESCREVER',
                                    'INSTITUICAO_ESCREVER']
    WHEN 'COORDENADOR' THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER','EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER',
                                  'USUARIO_LER','USUARIO_ESCREVER','UNIDADE_LER']
    WHEN 'RESPONSAVEL' THEN ARRAY['GESTAO_PROJETO_LER','GESTAO_PROJETO_ESCREVER','EMPRESA_LER','EMPRESA_ESCREVER','HISTORICO_LER']
    WHEN 'PRESTADOR_SERVICO' THEN ARRAY['GESTAO_PROJETO_LER','EMPRESA_LER']
    ELSE ARRAY[]::varchar[]
  END);

COMMIT;
