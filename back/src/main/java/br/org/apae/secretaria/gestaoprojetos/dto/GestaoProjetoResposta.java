package br.org.apae.secretaria.gestaoprojetos.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import br.org.apae.secretaria.comum.dominio.Prioridade;
import br.org.apae.secretaria.gestaoprojetos.GestaoProjeto;
import br.org.apae.secretaria.gestaoprojetos.GestaoProjetoEtapa;
import br.org.apae.secretaria.gestaoprojetos.StatusEtapa;
import br.org.apae.secretaria.gestaoprojetos.StatusGestaoProjeto;

/**
 * Projeto com os coordenadores já resolvidos (nome e cargo) e o progresso
 * (etapas concluídas de quantas existem). arquivadoEm nulo = ativo; excluidoEm preenchido = na lixeira.
 */
public record GestaoProjetoResposta(
        Long id, String nome, String processo, String contratante, String contratanteCidade, StatusGestaoProjeto status, Prioridade prioridade,
        LocalDate dataInicio, LocalDate dataFim, List<CoordenadorResposta> coordenadores, String convenioOrigem,
        String convenioNumero, BigDecimal valorConvenio, BigDecimal contrapartida, String origemRecurso,
        int etapasTotal, int etapasConcluidas, Instant arquivadoEm, Instant excluidoEm, Instant criadoEm, Instant atualizadoEm) {

    public static GestaoProjetoResposta de(GestaoProjeto p, List<CoordenadorResposta> coordenadores,
            List<GestaoProjetoEtapa> etapas) {
        int concluidas = (int) etapas.stream().filter(e -> e.getStatus() == StatusEtapa.CONCLUIDO).count();
        return new GestaoProjetoResposta(p.getId(), p.getNome(), p.getProcesso(), p.getContratante(), p.getContratanteCidade(), p.getStatus(),
                p.getPrioridade(), p.getDataInicio(), p.getDataFim(), coordenadores, p.getConvenioOrigem(),
                p.getConvenioNumero(), p.getValorConvenio(), p.getContrapartida(), p.getOrigemRecurso(),
                etapas.size(), concluidas, p.getArquivadoEm(), p.getExcluidoEm(), p.getCriadoEm(), p.getAtualizadoEm());
    }
}
