-- =====================================================================
-- ATUALIZAÇÃO: cargos e permissões só dos módulos atuais
-- (Gestão de Projetos, Kanban, Empresas, Histórico e Administração),
-- para um banco que já existia. Num banco novo não precisa: o apae.sql já está assim.
--   psql -U postgres -d apae -f usuarios-cargos-atuais.sql
-- Saem os cargos Professor e Profissional e as permissões de Agenda, Secretaria,
-- Atendimentos, Projetos (antigo), Documentos, Gerador, Relatórios e Chat.
-- Se algum usuário ainda tiver cargo Professor ou Profissional, nada é alterado:
-- troque o cargo dele em Administração → Usuários e rode de novo.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    pendentes TEXT;
BEGIN
    SELECT string_agg(u.login || ' (' || c.nome || ')', ', ' ORDER BY u.login)
      INTO pendentes
      FROM acesso.usuario u
      JOIN acesso.cargo c ON c.id = u.cargo_id
     WHERE c.codigo IN ('PROFESSOR', 'PROFISSIONAL');
    IF pendentes IS NOT NULL THEN
        RAISE EXCEPTION 'Troque o cargo destes usuários antes de atualizar: %', pendentes;
    END IF;
END $$;

-- Permissões que saem: primeiro os vínculos com os cargos (matriz padrão e ajustes das unidades).
DELETE FROM acesso.unidade_cargo_permissao
 WHERE permissao_id IN (SELECT id FROM acesso.permissao WHERE codigo IN (
           'AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
           'PROJETO_LER','PROJETO_ESCREVER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
           'RELATORIO_LER','CHAT_USAR','RELATORIO_PROF_ENVIAR','RELATORIO_PROF_LER','RELATORIO_PROF_COBRAR'))
    OR cargo_id IN (SELECT id FROM acesso.cargo WHERE codigo IN ('PROFESSOR', 'PROFISSIONAL'));

DELETE FROM acesso.cargo_permissao
 WHERE permissao_id IN (SELECT id FROM acesso.permissao WHERE codigo IN (
           'AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
           'PROJETO_LER','PROJETO_ESCREVER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
           'RELATORIO_LER','CHAT_USAR','RELATORIO_PROF_ENVIAR','RELATORIO_PROF_LER','RELATORIO_PROF_COBRAR'))
    OR cargo_id IN (SELECT id FROM acesso.cargo WHERE codigo IN ('PROFESSOR', 'PROFISSIONAL'));

DELETE FROM acesso.permissao WHERE codigo IN (
    'AGENDA_LER','AGENDA_ESCREVER','TAREFA_LER','TAREFA_ESCREVER','ATENDIMENTO_LER','ATENDIMENTO_ESCREVER',
    'PROJETO_LER','PROJETO_ESCREVER','DOCUMENTO_LER','DOCUMENTO_ESCREVER','GERADOR_LER','GERADOR_ESCREVER',
    'RELATORIO_LER','CHAT_USAR','RELATORIO_PROF_ENVIAR','RELATORIO_PROF_LER','RELATORIO_PROF_COBRAR');

DELETE FROM acesso.cargo WHERE codigo IN ('PROFESSOR', 'PROFISSIONAL');

COMMIT;
