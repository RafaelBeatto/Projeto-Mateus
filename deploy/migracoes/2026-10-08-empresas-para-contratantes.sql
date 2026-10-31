-- =====================================================================
-- Migração de produção: "Empresas" passa a se chamar "Contratantes" na tela.
-- Só troca as descrições das permissões (códigos e tabelas continuam os mesmos).
-- Pode rodar de novo sem problema.
-- Rodar como dono do banco:  psql -d apae -c "SET ROLE apae;" -f este-arquivo.sql
-- =====================================================================
BEGIN;

UPDATE acesso.permissao SET descricao = 'Ver contratantes' WHERE codigo = 'EMPRESA_LER';
UPDATE acesso.permissao SET descricao = 'Cadastrar e editar contratantes' WHERE codigo = 'EMPRESA_ESCREVER';

COMMIT;
