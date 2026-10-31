package br.com.projetosmamore.gestaoprojetos;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.usuario.Usuario;
import br.com.projetosmamore.acesso.usuario.UsuarioRepositorio;
import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.comum.Relogio;
import br.com.projetosmamore.comum.Textos;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.empresas.Empresa;
import br.com.projetosmamore.empresas.EmpresaRepositorio;
import br.com.projetosmamore.gestaoprojetos.dto.CoordenadorResposta;
import br.com.projetosmamore.gestaoprojetos.dto.GestaoProjetoResposta;
import br.com.projetosmamore.gestaoprojetos.dto.RequisicaoGestaoProjeto;
import br.com.projetosmamore.seguranca.ContextoSeguranca;
import br.com.projetosmamore.sistema.historico.AcaoHistorico;
import br.com.projetosmamore.sistema.historico.ModuloHistorico;
import br.com.projetosmamore.sistema.historico.ServicoHistorico;
import br.com.projetosmamore.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Gestão de Projetos: projetos por unidade, organizados no Kanban por status.
 * Todo projeto nasce Em espera; o status só muda pelo quadro.
 * Coordenadores são usuários ativos da mesma unidade.
 */
@Service
@RequiredArgsConstructor
public class ServicoGestaoProjeto {

    private static final String REF = "GESTAO_PROJETO";

    private final GestaoProjetoRepositorio projetos;
    private final GestaoProjetoCoordenadorRepositorio coordenadores;
    private final GestaoProjetoEtapaRepositorio etapas;
    private final GestaoProjetoMensagemRepositorio mensagens;
    private final UsuarioRepositorio usuarios;
    private final EmpresaRepositorio empresas;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final Relogio relogio;

    /** Ativos (Kanban), pelo nome; ou só os arquivados, do mais recente ao mais antigo. Nunca os da lixeira. */
    @Transactional(readOnly = true)
    public List<GestaoProjetoResposta> itens(boolean arquivados) {
        Long unidadeId = contexto.unidadeLeitura();
        return respostas(arquivados
                ? projetos.findByUnidadeIdAndArquivadoEmIsNotNullAndExcluidoEmIsNullOrderByArquivadoEmDesc(unidadeId)
                : projetos.findByUnidadeIdAndArquivadoEmIsNullAndExcluidoEmIsNullOrderByNomeAsc(unidadeId));
    }

    /** Ids dos projetos ativos (no Kanban) da unidade em consulta. */
    List<Long> idsAtivos() {
        return projetos.findByUnidadeIdAndArquivadoEmIsNullAndExcluidoEmIsNullOrderByNomeAsc(contexto.unidadeLeitura())
                .stream().map(GestaoProjeto::getId).toList();
    }

    /** Projetos na lixeira, do excluído mais recentemente ao mais antigo. */
    @Transactional(readOnly = true)
    public List<GestaoProjetoResposta> lixeira() {
        return respostas(projetos.findByUnidadeIdAndExcluidoEmIsNotNullOrderByExcluidoEmDesc(contexto.unidadeLeitura()));
    }

    private List<GestaoProjetoResposta> respostas(List<GestaoProjeto> lista) {
        List<GestaoProjetoCoordenador> vinculos = coordenadores
                .findByProjetoIdIn(lista.stream().map(GestaoProjeto::getId).toList());
        Map<Long, CoordenadorResposta> pessoas = pessoas(vinculos);
        Map<Long, List<CoordenadorResposta>> porProjeto = vinculos.stream()
                .filter(v -> pessoas.containsKey(v.getUsuarioId()))
                .collect(Collectors.groupingBy(GestaoProjetoCoordenador::getProjetoId,
                        Collectors.mapping(v -> pessoas.get(v.getUsuarioId()), Collectors.toList())));
        Map<Long, List<GestaoProjetoEtapa>> etapasPorProjeto = etapas
                .findByProjetoIdIn(lista.stream().map(GestaoProjeto::getId).toList()).stream()
                .collect(Collectors.groupingBy(GestaoProjetoEtapa::getProjetoId));
        return lista.stream().map(p -> GestaoProjetoResposta.de(p, porProjeto.getOrDefault(p.getId(), List.of()),
                etapasPorProjeto.getOrDefault(p.getId(), List.of()))).toList();
    }

    @Transactional(readOnly = true)
    public GestaoProjetoResposta detalhe(Long id) {
        return resposta(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        GestaoProjeto p = buscarParaLeitura(id);
        return historico.doRegistro(p.getUnidadeId(), REF, id);
    }

    /** Histórico geral da Gestão de Projetos: ações de todos os projetos (e etapas) da unidade no intervalo. */
    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoGeral(Instant desde, Instant ate) {
        if (!desde.isBefore(ate)) {
            throw new RegraNegocioExcecao("O início do período deve ser anterior ao fim.");
        }
        return historico.doModulo(contexto.unidadeLeitura(), ModuloHistorico.GESTAO_PROJETOS, desde, ate);
    }

    /** Usuários ativos da unidade que podem ser escolhidos como coordenadores. */
    @Transactional(readOnly = true)
    public List<CoordenadorResposta> coordenadoresDisponiveis() {
        return usuarios.buscar(contexto.unidadeLeitura(), "", Pageable.unpaged()).stream()
                .filter(Usuario::isAtivo)
                .map(CoordenadorResposta::de)
                .sorted((a, b) -> a.nomeCompleto().compareToIgnoreCase(b.nomeCompleto()))
                .toList();
    }

    @Transactional
    public GestaoProjetoResposta criar(RequisicaoGestaoProjeto r) {
        GestaoProjeto p = new GestaoProjeto(contexto.unidadeEscrita(), contexto.usuario().id());
        preencher(p, r);
        projetos.save(p);
        salvarCoordenadores(p, r.coordenadores());
        historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.CRIACAO,
                "Projeto \"%s\" criado.".formatted(p.getNome()), REF, p.getId());
        return resposta(p);
    }

    @Transactional
    public GestaoProjetoResposta atualizar(Long id, RequisicaoGestaoProjeto r) {
        GestaoProjeto p = buscarParaEscrita(id);
        preencher(p, r);
        salvarCoordenadores(p, r.coordenadores());
        historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.EDICAO,
                "Dados do projeto \"%s\" atualizados.".formatted(p.getNome()), REF, id);
        return resposta(p);
    }

    @Transactional
    public GestaoProjetoResposta alterarStatus(Long id, StatusGestaoProjeto status) {
        GestaoProjeto p = buscarParaEscrita(id);
        if (p.getStatus() != status) {
            p.setStatus(status);
            historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.MOVIMENTACAO,
                    "Projeto \"%s\" movido para %s.".formatted(p.getNome(), rotulo(status)), REF, id);
        }
        return resposta(p);
    }

    /** Arquivado sai do Kanban e fica só em "Arquivados", sem edição, até ser desarquivado. */
    @Transactional
    public GestaoProjetoResposta arquivar(Long id, boolean arquivar) {
        GestaoProjeto p = buscarDaUnidadeParaEscrita(id);
        if (p.getExcluidoEm() != null) {
            throw new RegraNegocioExcecao("Este projeto está na lixeira. Restaure-o antes.");
        }
        if ((p.getArquivadoEm() != null) != arquivar) {
            p.setArquivadoEm(arquivar ? Instant.now() : null);
            historico.registrar(ModuloHistorico.GESTAO_PROJETOS,
                    arquivar ? AcaoHistorico.ARQUIVAMENTO : AcaoHistorico.REABERTURA,
                    "Projeto \"%s\" %s.".formatted(p.getNome(), arquivar ? "arquivado" : "desarquivado"), REF, id);
        }
        return resposta(p);
    }

    /** Excluir manda para a lixeira: some do Kanban e dos Arquivados, mas pode ser restaurado. */
    @Transactional
    public void excluir(Long id) {
        GestaoProjeto p = buscarDaUnidadeParaEscrita(id);
        if (p.getExcluidoEm() == null) {
            p.setExcluidoEm(Instant.now());
            historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.EXCLUSAO,
                    "Projeto \"%s\" movido para a lixeira.".formatted(p.getNome()), REF, id);
        }
    }

    /** Tira da lixeira: volta para onde estava (Kanban, ou Arquivados se estava arquivado). */
    @Transactional
    public GestaoProjetoResposta restaurar(Long id) {
        GestaoProjeto p = buscarNaLixeira(id);
        p.setExcluidoEm(null);
        historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.REABERTURA,
                "Projeto \"%s\" restaurado da lixeira.".formatted(p.getNome()), REF, id);
        return resposta(p);
    }

    /** Esvazia a lixeira da unidade; devolve quantos projetos foram excluídos de vez. */
    @Transactional
    public int esvaziarLixeira() {
        List<GestaoProjeto> lista = projetos.findByUnidadeIdAndExcluidoEmIsNotNullOrderByExcluidoEmDesc(contexto.unidadeEscrita());
        lista.forEach(this::excluirDeVez);
        return lista.size();
    }

    /** Exclusão definitiva, só de projeto que já está na lixeira (sem volta). */
    @Transactional
    public void excluirDefinitivo(Long id) {
        excluirDeVez(buscarNaLixeira(id));
    }

    private GestaoProjeto buscarNaLixeira(Long id) {
        GestaoProjeto p = buscarDaUnidadeParaEscrita(id);
        if (p.getExcluidoEm() == null) {
            throw new RegraNegocioExcecao("Este projeto não está na lixeira.");
        }
        return p;
    }

    private void excluirDeVez(GestaoProjeto p) {
        Long id = p.getId();
        String nome = p.getNome();
        coordenadores.deleteAll(coordenadores.findByProjetoIdOrderByCriadoEmAsc(id));
        etapas.deleteAll(etapas.findByProjetoIdOrderByCriadoEmAsc(id));
        mensagens.deleteAll(mensagens.findByProjetoId(id));
        projetos.delete(p);
        historico.registrar(ModuloHistorico.GESTAO_PROJETOS, AcaoHistorico.EXCLUSAO,
                "Projeto \"%s\" excluído.".formatted(nome), REF, id);
    }

    /**
     * O contratante tem de estar cadastrado em Contratantes; a cidade vem do município (e UF) dele.
     * Projeto antigo com contratante fora da lista continua com ele enquanto não for trocado.
     */
    private void preencherContratante(GestaoProjeto p, String nome) {
        if (nome == null) {
            p.setContratante(null);
            p.setContratanteCidade(null);
            return;
        }
        Optional<Empresa> cadastrado = empresas.findByUnidadeIdAndRazaoSocialIgnoreCase(p.getUnidadeId(), nome);
        if (cadastrado.isEmpty()) {
            if (nome.equalsIgnoreCase(p.getContratante())) return;
            throw new RegraNegocioExcecao("Escolha um contratante cadastrado em Contratantes.");
        }
        Empresa e = cadastrado.get();
        String cidade = Stream.of(e.getMunicipio(), e.getUf()).filter(Objects::nonNull).collect(Collectors.joining("/"));
        p.setContratante(e.getRazaoSocial());
        int limite = Limites.GESTAO_PROJETO_CONTRATANTE_CIDADE;
        p.setContratanteCidade(cidade.isEmpty() ? null : cidade.substring(0, Math.min(cidade.length(), limite)));
    }

    private void preencher(GestaoProjeto p, RequisicaoGestaoProjeto r) {
        p.setNome(Textos.limpo(r.nome()));
        p.setProcesso(Textos.limpo(r.processo()));
        preencherContratante(p, Textos.limpo(r.contratante()));
        p.setPrioridade(r.prioridade());
        p.setDataInicio(r.dataInicio() != null ? r.dataInicio() : relogio.hoje());
        p.setDataFim(r.dataFim());
        if (p.getDataFim() != null && p.getDataFim().isBefore(p.getDataInicio())) {
            throw new RegraNegocioExcecao("A data de término não pode ser anterior à de início.");
        }
        p.setConvenioOrigem(Textos.limpo(r.convenioOrigem()));
        p.setConvenioNumero(Textos.limpo(r.convenioNumero()));
        p.setValorConvenio(r.valorConvenio());
        p.setContrapartida(r.contrapartida());
        p.setOrigemRecurso(Textos.limpo(r.origemRecurso()));
    }

    /** Substitui a lista de coordenadores; só usuários ativos da unidade do projeto. */
    private void salvarCoordenadores(GestaoProjeto p, List<Long> ids) {
        Set<Long> novos = ids == null ? Set.of() : new LinkedHashSet<>(ids);
        if (!novos.isEmpty()) {
            List<Usuario> encontrados = usuarios.findAllById(novos);
            boolean validos = encontrados.size() == novos.size() && encontrados.stream()
                    .allMatch(u -> u.isAtivo() && u.getUnidade().getId().equals(p.getUnidadeId()));
            if (!validos) {
                throw new RegraNegocioExcecao("Escolha coordenadores ativos desta unidade.");
            }
        }
        List<GestaoProjetoCoordenador> atuais = coordenadores.findByProjetoIdOrderByCriadoEmAsc(p.getId());
        coordenadores.deleteAll(atuais.stream().filter(c -> !novos.contains(c.getUsuarioId())).toList());
        Set<Long> mantidos = atuais.stream().map(GestaoProjetoCoordenador::getUsuarioId).collect(Collectors.toSet());
        novos.stream().filter(id -> !mantidos.contains(id))
                .forEach(id -> coordenadores.save(new GestaoProjetoCoordenador(p.getId(), id)));
    }

    private Map<Long, CoordenadorResposta> pessoas(List<GestaoProjetoCoordenador> vinculos) {
        return usuarios.findAllById(vinculos.stream().map(GestaoProjetoCoordenador::getUsuarioId).distinct().toList())
                .stream().map(CoordenadorResposta::de)
                .collect(Collectors.toMap(CoordenadorResposta::id, Function.identity()));
    }

    private GestaoProjetoResposta resposta(GestaoProjeto p) {
        List<GestaoProjetoCoordenador> vinculos = coordenadores.findByProjetoIdOrderByCriadoEmAsc(p.getId());
        Map<Long, CoordenadorResposta> pessoas = pessoas(vinculos);
        return GestaoProjetoResposta.de(p, vinculos.stream().map(v -> pessoas.get(v.getUsuarioId()))
                .filter(java.util.Objects::nonNull).toList(), etapas.findByProjetoIdOrderByCriadoEmAsc(p.getId()));
    }

    private static String rotulo(StatusGestaoProjeto status) {
        return switch (status) {
            case EM_ESPERA -> "Em espera";
            case EM_PAUSA -> "Em pausa";
            case EM_ANDAMENTO -> "Em andamento";
            case EM_ANALISE -> "Em análise";
        };
    }

    GestaoProjeto buscarParaLeitura(Long id) {
        GestaoProjeto p = projetos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Projeto"));
        contexto.exigirLeitura(p.getUnidadeId());
        return p;
    }

    /** Para alterar o projeto, suas etapas e tarefas: arquivado ou na lixeira não aceita alterações. */
    GestaoProjeto buscarParaEscrita(Long id) {
        GestaoProjeto p = buscarDaUnidadeParaEscrita(id);
        if (p.getExcluidoEm() != null) {
            throw new RegraNegocioExcecao("Este projeto está na lixeira. Restaure-o para fazer alterações.");
        }
        if (p.getArquivadoEm() != null) {
            throw new RegraNegocioExcecao("Este projeto está arquivado. Desarquive-o para fazer alterações.");
        }
        return p;
    }

    /** Arquivar, desarquivar e excluir valem também para projetos arquivados. */
    private GestaoProjeto buscarDaUnidadeParaEscrita(Long id) {
        GestaoProjeto p = projetos.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Projeto"));
        contexto.exigirEscrita(p.getUnidadeId());
        return p;
    }
}
