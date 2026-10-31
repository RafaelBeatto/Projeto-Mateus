package br.com.projetosmamore.sistema.administracao.dto;

import java.time.Instant;
import java.util.List;

/** Tudo sobre um usuário, de qualquer unidade (tela do dono). */
public record FichaUsuario(Dados dados, Sessoes sessoes, Trabalho trabalho, Atividade atividade) {

    public record Dados(Long id, String login, String nome, String funcao, String cargoNome, String unidadeNome,
            String unidadeTipo, boolean ativo, boolean trocarSenha, boolean dono, Instant criadoEm,
            Instant atualizadoEm, String criadoPorNome, Instant ultimoAcessoEm) {
    }

    /** Sessões abertas agora (tokens de renovação válidos, um por aparelho/navegador). */
    public record Sessoes(long abertas, Instant ultimaEntrada, Instant expiraEm) {
    }

    /** O que está nas mãos da pessoa na Gestão de Projetos e o que ela enviou. */
    public record Trabalho(long projetosCoordenados, long etapas, long etapasAbertas, long tarefas, long tarefasAbertas,
            long mensagensChat, long arquivosEnviados, long arquivosBytes) {
    }

    public record Atividade(long acoesTotal, long acoesUltimos30Dias, Instant ultimaAcaoEm, List<PorModulo> porModulo,
            List<Acao> ultimasAcoes) {
    }

    public record PorModulo(String modulo, long quantidade) {
    }

    public record Acao(Long id, String modulo, String acao, String descricao, String unidadeNome, Instant criadoEm) {
    }
}
