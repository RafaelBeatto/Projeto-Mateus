package br.com.projetosmamore.gestaoprojetos;

import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.usuario.Usuario;
import br.com.projetosmamore.acesso.usuario.UsuarioRepositorio;
import br.com.projetosmamore.comum.Textos;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.gestaoprojetos.dto.CoordenadorResposta;
import br.com.projetosmamore.gestaoprojetos.dto.EtapaResposta;
import br.com.projetosmamore.gestaoprojetos.dto.RequisicaoEtapa;
import br.com.projetosmamore.gestaoprojetos.dto.RequisicoesTarefaEtapa;
import br.com.projetosmamore.sistema.historico.AcaoHistorico;
import br.com.projetosmamore.sistema.historico.ModuloHistorico;
import br.com.projetosmamore.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Etapas de um projeto da Gestão de Projetos (Kanban dentro do projeto).
 * O responsável (da etapa e de cada tarefa) é um usuário ativo da unidade do projeto. O histórico fica no próprio projeto.
 */
@Service
@RequiredArgsConstructor
public class ServicoGestaoProjetoEtapa {

    private static final String REF = "GESTAO_PROJETO";

    private final ServicoGestaoProjeto servicoProjeto;
    private final GestaoProjetoEtapaRepositorio etapas;
    private final GestaoProjetoEtapaTarefaRepositorio tarefas;
    private final UsuarioRepositorio usuarios;
    private final ServicoHistorico historico;

    @Transactional(readOnly = true)
    public List<EtapaResposta> itens(Long projetoId) {
        servicoProjeto.buscarParaLeitura(projetoId);
        return respostas(etapas.findByProjetoIdOrderByCriadoEmAsc(projetoId));
    }

    /** Etapas (com tarefas) de todos os projetos ativos da unidade, para o Kanban geral. */
    @Transactional(readOnly = true)
    public List<EtapaResposta> dosProjetosAtivos() {
        List<Long> ids = servicoProjeto.idsAtivos();
        if (ids.isEmpty()) {
            return List.of();
        }
        return respostas(etapas.findByProjetoIdIn(ids).stream()
                .sorted(Comparator.comparing(GestaoProjetoEtapa::getCriadoEm)).toList());
    }

    private List<EtapaResposta> respostas(List<GestaoProjetoEtapa> lista) {
        List<GestaoProjetoEtapaTarefa> todasTarefas = tarefas
                .findByEtapaIdInOrderByOrdemAscIdAsc(lista.stream().map(GestaoProjetoEtapa::getId).toList());
        Map<Long, List<GestaoProjetoEtapaTarefa>> tarefasPorEtapa = todasTarefas.stream()
                .collect(Collectors.groupingBy(GestaoProjetoEtapaTarefa::getEtapaId));
        Map<Long, CoordenadorResposta> pessoas = pessoas(lista, todasTarefas);
        return lista.stream().map(e -> EtapaResposta.de(e, tarefasPorEtapa.getOrDefault(e.getId(), List.of()), pessoas)).toList();
    }

    @Transactional
    public EtapaResposta criar(Long projetoId, RequisicaoEtapa r) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = new GestaoProjetoEtapa(projetoId);
        preencher(e, r, p);
        if (r.status() != null) {
            e.setStatus(r.status());
        }
        etapas.save(e);
        registrar(p, AcaoHistorico.CRIACAO, "Etapa \"%s\" criada no projeto \"%s\".".formatted(e.getTitulo(), p.getNome()));
        return resposta(e);
    }

    @Transactional
    public EtapaResposta atualizar(Long projetoId, Long etapaId, RequisicaoEtapa r) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        preencher(e, r, p);
        if (r.status() != null) {
            e.setStatus(r.status());
        }
        registrar(p, AcaoHistorico.EDICAO, "Etapa \"%s\" editada no projeto \"%s\".".formatted(e.getTitulo(), p.getNome()));
        return resposta(e);
    }

    @Transactional
    public EtapaResposta alterarStatus(Long projetoId, Long etapaId, StatusEtapa status) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        if (e.getStatus() != status) {
            e.setStatus(status);
            registrar(p, status == StatusEtapa.CONCLUIDO ? AcaoHistorico.CONCLUSAO : AcaoHistorico.MOVIMENTACAO,
                    "Etapa \"%s\" movida para %s.".formatted(e.getTitulo(), rotulo(status)));
        }
        return resposta(e);
    }

    @Transactional
    public void excluir(Long projetoId, Long etapaId) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        // As ramificações que saíam dela passam a sair de onde ela saía.
        etapas.findByEtapaPaiId(etapaId).forEach(filha -> filha.setEtapaPaiId(e.getEtapaPaiId()));
        etapas.delete(e);
        registrar(p, AcaoHistorico.EXCLUSAO, "Etapa \"%s\" excluída do projeto \"%s\".".formatted(e.getTitulo(), p.getNome()));
    }

    @Transactional
    public EtapaResposta adicionarTarefa(Long projetoId, Long etapaId, RequisicoesTarefaEtapa.Dados r) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        GestaoProjetoEtapaTarefa t = new GestaoProjetoEtapaTarefa(etapaId, (short) tarefas.countByEtapaId(etapaId));
        preencher(t, r, p);
        tarefas.save(t);
        registrar(p, AcaoHistorico.EDICAO, "Tarefa \"%s\" adicionada à etapa \"%s\".".formatted(t.getTexto(), e.getTitulo()));
        return resposta(e);
    }

    @Transactional
    public EtapaResposta atualizarTarefa(Long projetoId, Long etapaId, Long tarefaId, RequisicoesTarefaEtapa.Dados r) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        GestaoProjetoEtapaTarefa t = tarefaDa(etapaId, tarefaId);
        preencher(t, r, p);
        registrar(p, AcaoHistorico.EDICAO, "Tarefa \"%s\" da etapa \"%s\" editada.".formatted(t.getTexto(), e.getTitulo()));
        return resposta(e);
    }

    private void preencher(GestaoProjetoEtapaTarefa t, RequisicoesTarefaEtapa.Dados r, GestaoProjeto p) {
        t.setTexto(Textos.limpo(r.texto()));
        t.setPrazo(r.prazo());
        if (r.responsavelId() == null) {
            t.setResponsavelId(null);
        } else if (!r.responsavelId().equals(t.getResponsavelId())) {
            t.setResponsavelId(responsavelValido(r.responsavelId(), p).getId());
        }
        Set<Long> tarefaIds = idsDe(r.dependencias());
        Set<Long> etapaIds = idsDe(r.dependenciasEtapas());
        if (!tarefaIds.isEmpty() || !etapaIds.isEmpty()) {
            validarDependencias(t, tarefaIds, etapaIds, p.getId());
        }
        t.definirDependencias(tarefaIds, etapaIds);
        definirStatus(t, r.status() == null ? StatusTarefaEtapa.EM_ESPERA : r.status());
    }

    /** Concluída = feita: concluir exige as dependências concluídas; qualquer outro status desmarca. */
    private void definirStatus(GestaoProjetoEtapaTarefa t, StatusTarefaEtapa status) {
        if (status == StatusTarefaEtapa.CONCLUIDA && !t.isFeita()) {
            exigirDependenciasConcluidas(t);
        }
        t.setStatus(status);
        t.setFeita(status == StatusTarefaEtapa.CONCLUIDA);
    }

    private void exigirDependenciasConcluidas(GestaoProjetoEtapaTarefa t) {
        List<String> pendentes = Stream.concat(
                etapas.findAllById(t.getDependenciasEtapas()).stream().filter(d -> d.getStatus() != StatusEtapa.CONCLUIDO)
                        .map(d -> "etapa \"" + d.getTitulo() + "\""),
                tarefas.findAllById(t.getDependencias()).stream().filter(d -> !d.isFeita())
                        .map(d -> "\"" + d.getTexto() + "\"")).toList();
        if (!pendentes.isEmpty()) {
            throw new RegraNegocioExcecao("Conclua antes: " + String.join(", ", pendentes) + ".");
        }
    }

    private static Set<Long> idsDe(List<Long> pedidos) {
        return pedidos == null ? Set.of() : pedidos.stream().filter(Objects::nonNull).collect(Collectors.toSet());
    }

    /**
     * Tarefas e etapas do mesmo projeto; nunca a própria tarefa nem a própria etapa; e sem ciclo entre tarefas
     * (A depende de B que depende de A). Etapa não depende de nada, então não fecha ciclo.
     */
    private void validarDependencias(GestaoProjetoEtapaTarefa t, Set<Long> tarefaIds, Set<Long> etapaIds, Long projetoId) {
        List<Long> etapasDoProjeto = etapas.findByProjetoIdOrderByCriadoEmAsc(projetoId).stream().map(GestaoProjetoEtapa::getId).toList();
        if (etapaIds.contains(t.getEtapaId()) || !etapasDoProjeto.containsAll(etapaIds)) {
            throw new RegraNegocioExcecao("A tarefa só pode depender de outras etapas deste projeto.");
        }
        Map<Long, GestaoProjetoEtapaTarefa> doProjeto = tarefasDoProjeto(etapasDoProjeto);
        if (tarefaIds.contains(t.getId()) || !doProjeto.keySet().containsAll(tarefaIds)) {
            throw new RegraNegocioExcecao("A tarefa só pode depender de outras tarefas deste projeto.");
        }
        // Tarefa nova ainda não tem quem dependa dela: não há como fechar um ciclo.
        if (t.getId() != null) {
            Deque<Long> pendentes = new ArrayDeque<>(tarefaIds);
            Set<Long> vistos = new HashSet<>();
            while (!pendentes.isEmpty()) {
                Long atual = pendentes.pop();
                if (atual.equals(t.getId())) {
                    throw new RegraNegocioExcecao("Essas dependências formam um ciclo: uma tarefa acabaria esperando por ela mesma.");
                }
                if (vistos.add(atual)) {
                    pendentes.addAll(doProjeto.get(atual).getDependencias());
                }
            }
        }
    }

    private Map<Long, GestaoProjetoEtapaTarefa> tarefasDoProjeto(List<Long> etapaIds) {
        return tarefas.findByEtapaIdInOrderByOrdemAscIdAsc(etapaIds).stream()
                .collect(Collectors.toMap(GestaoProjetoEtapaTarefa::getId, Function.identity()));
    }

    @Transactional
    public EtapaResposta marcarTarefa(Long projetoId, Long etapaId, Long tarefaId, boolean feita) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        GestaoProjetoEtapaTarefa t = tarefaDa(etapaId, tarefaId);
        if (t.isFeita() != feita) {
            // Desmarcar volta para Em espera.
            definirStatus(t, feita ? StatusTarefaEtapa.CONCLUIDA : StatusTarefaEtapa.EM_ESPERA);
            registrar(p, AcaoHistorico.EDICAO, "Tarefa \"%s\" da etapa \"%s\" marcada como %s.".formatted(
                    t.getTexto(), e.getTitulo(), feita ? "concluída" : "pendente"));
        }
        return resposta(e);
    }

    @Transactional
    public EtapaResposta removerTarefa(Long projetoId, Long etapaId, Long tarefaId) {
        GestaoProjeto p = servicoProjeto.buscarParaEscrita(projetoId);
        GestaoProjetoEtapa e = etapaDo(projetoId, etapaId);
        GestaoProjetoEtapaTarefa t = tarefaDa(etapaId, tarefaId);
        // Quem dependia dela deixa de depender (o banco também apaga, mas as entidades carregadas precisam saber).
        tarefasDoProjeto(etapas.findByProjetoIdOrderByCriadoEmAsc(projetoId).stream().map(GestaoProjetoEtapa::getId).toList())
                .values().forEach(outra -> outra.getDependencias().remove(tarefaId));
        tarefas.delete(t);
        tarefas.flush();
        registrar(p, AcaoHistorico.EDICAO, "Tarefa \"%s\" removida da etapa \"%s\".".formatted(t.getTexto(), e.getTitulo()));
        return resposta(e);
    }

    private GestaoProjetoEtapaTarefa tarefaDa(Long etapaId, Long tarefaId) {
        return tarefas.findById(tarefaId).filter(t -> t.getEtapaId().equals(etapaId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Tarefa"));
    }

    private void preencher(GestaoProjetoEtapa e, RequisicaoEtapa r, GestaoProjeto p) {
        e.setTitulo(Textos.limpo(r.titulo()));
        e.setDescricao(Textos.limpo(r.descricao()));
        e.setPrazo(r.prazo());
        e.setEtapaPaiId(paiValido(e, r.etapaPaiId()));
        if (r.responsavelId() != null && !r.responsavelId().equals(e.getResponsavelId())) {
            e.setResponsavelId(responsavelValido(r.responsavelId(), p).getId());
        } else if (r.responsavelId() == null) {
            e.setResponsavelId(null);
        }
    }

    /** Ramificação de origem: outra etapa do mesmo projeto, e nunca ela mesma nem uma que sai dela (ciclo). */
    private Long paiValido(GestaoProjetoEtapa e, Long paiId) {
        if (paiId == null) {
            return null;
        }
        Map<Long, GestaoProjetoEtapa> doProjeto = etapas.findByProjetoIdOrderByCriadoEmAsc(e.getProjetoId()).stream()
                .collect(Collectors.toMap(GestaoProjetoEtapa::getId, Function.identity()));
        if (!doProjeto.containsKey(paiId)) {
            throw new RegraNegocioExcecao("A ramificação só pode sair de outra etapa deste projeto.");
        }
        Set<Long> vistos = new HashSet<>();
        for (Long atual = paiId; atual != null && vistos.add(atual); ) {
            if (atual.equals(e.getId())) {
                throw new RegraNegocioExcecao("Uma etapa não pode sair dela mesma nem de uma ramificação dela.");
            }
            GestaoProjetoEtapa etapa = doProjeto.get(atual);
            atual = etapa == null ? null : etapa.getEtapaPaiId();
        }
        return paiId;
    }

    /** Responsável (de etapa ou tarefa) novo: usuário ativo da unidade do projeto. Quem já era continua, mesmo inativo. */
    private Usuario responsavelValido(Long usuarioId, GestaoProjeto p) {
        return usuarios.findById(usuarioId)
                .filter(x -> x.isAtivo() && x.getUnidade().getId().equals(p.getUnidadeId()))
                .orElseThrow(() -> new RegraNegocioExcecao("Escolha um responsável ativo desta unidade."));
    }

    /** Responsáveis das etapas e das tarefas, por id (uma consulta só). */
    private Map<Long, CoordenadorResposta> pessoas(List<GestaoProjetoEtapa> lista, List<GestaoProjetoEtapaTarefa> listaTarefas) {
        List<Long> ids = Stream.concat(lista.stream().map(GestaoProjetoEtapa::getResponsavelId),
                listaTarefas.stream().map(GestaoProjetoEtapaTarefa::getResponsavelId)).filter(Objects::nonNull).distinct().toList();
        return usuarios.findAllById(ids).stream().map(CoordenadorResposta::de)
                .collect(Collectors.toMap(CoordenadorResposta::id, Function.identity()));
    }

    private GestaoProjetoEtapa etapaDo(Long projetoId, Long etapaId) {
        return etapas.findById(etapaId).filter(e -> e.getProjetoId().equals(projetoId))
                .orElseThrow(() -> new NaoEncontradoExcecao("Etapa"));
    }

    private EtapaResposta resposta(GestaoProjetoEtapa e) {
        List<GestaoProjetoEtapaTarefa> daEtapa = tarefas.findByEtapaIdOrderByOrdemAscIdAsc(e.getId());
        return EtapaResposta.de(e, daEtapa, pessoas(List.of(e), daEtapa));
    }

    private void registrar(GestaoProjeto p, AcaoHistorico acao, String descricao) {
        historico.registrar(ModuloHistorico.GESTAO_PROJETOS, acao, descricao, REF, p.getId());
    }

    private static String rotulo(StatusEtapa status) {
        return switch (status) {
            case EM_ESPERA -> "Em espera";
            case EM_PAUSA -> "Em pausa";
            case EM_ANDAMENTO -> "Em andamento";
            case CONCLUIDO -> "Concluído";
        };
    }
}
