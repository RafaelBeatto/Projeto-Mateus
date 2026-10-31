package br.org.apae.secretaria.sistema.administracao.dto;

import java.time.Instant;
import java.util.List;

/** Visão geral do sistema inteiro (todas as unidades), só para o dono. */
public record PainelSistema(Contagens contagens, Aplicacao aplicacao, Banco banco) {

    public record Contagens(long unidades, long unidadesAtivas, long usuarios, long usuariosAtivos,
            long usuariosTrocarSenha, long acessosUltimas24h, long usuariosComSessao, long projetos,
            long arquivos, long arquivosBytes) {
    }

    public record Aplicacao(String versao, List<String> perfis, String java, Instant iniciadaEm,
            long memoriaUsadaMb, long memoriaMaximaMb, String armazenamento) {
    }

    public record Banco(String versao, long tamanhoBytes) {
    }
}
