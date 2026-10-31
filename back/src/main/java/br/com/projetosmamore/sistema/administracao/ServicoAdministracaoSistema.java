package br.com.projetosmamore.sistema.administracao;

import java.lang.management.ManagementFactory;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.springframework.core.env.Environment;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.autenticacao.TokenRenovacaoRepositorio;
import br.com.projetosmamore.acesso.cargo.Cargo;
import br.com.projetosmamore.acesso.cargo.CargoRepositorio;
import br.com.projetosmamore.acesso.unidade.Unidade;
import br.com.projetosmamore.acesso.unidade.UnidadeRepositorio;
import br.com.projetosmamore.acesso.usuario.Usuario;
import br.com.projetosmamore.acesso.usuario.UsuarioRepositorio;
import br.com.projetosmamore.acesso.usuario.dto.UsuarioDetalhe;
import br.com.projetosmamore.comum.Textos;
import br.com.projetosmamore.comum.excecao.AcessoNegadoExcecao;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.comum.validacao.DocumentoFiscal;
import br.com.projetosmamore.comum.web.Pagina;
import br.com.projetosmamore.configuracao.PropriedadesAplicacao;
import br.com.projetosmamore.seguranca.ContextoSeguranca;
import br.com.projetosmamore.seguranca.RegistroRevogacoes;
import br.com.projetosmamore.seguranca.ServicoUsuarioAutenticado;
import br.com.projetosmamore.sistema.administracao.dto.EmpresaSistema;
import br.com.projetosmamore.sistema.administracao.dto.FichaUsuario;
import br.com.projetosmamore.sistema.administracao.dto.RequisicaoNovaEmpresa;
import br.com.projetosmamore.sistema.administracao.dto.PainelSistema;
import br.com.projetosmamore.sistema.administracao.dto.SessaoAtiva;
import br.com.projetosmamore.sistema.administracao.dto.UsuarioSistema;
import br.com.projetosmamore.sistema.arquivo.Armazenamento;
import br.com.projetosmamore.sistema.arquivo.ArmazenamentoS3;
import br.com.projetosmamore.sistema.historico.AcaoHistorico;
import br.com.projetosmamore.sistema.historico.ModuloHistorico;
import br.com.projetosmamore.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Tela do dono do sistema: enxerga e age em todas as unidades, sem a regra da hierarquia.
 * Quem chama já passou por {@code @PreAuthorize(Permissoes.DONO_SISTEMA)}.
 * O dono nunca age sobre a própria conta aqui (para não se trancar para fora).
 */
@Service
@RequiredArgsConstructor
public class ServicoAdministracaoSistema {

    private static final String REF = "USUARIO";
    private static final String REF_EMPRESA = "UNIDADE";
    private static final long MB = 1024 * 1024;

    private final ConsultasAdministracao consultas;
    private final UsuarioRepositorio usuarios;
    private final UnidadeRepositorio unidades;
    private final CargoRepositorio cargos;
    private final TokenRenovacaoRepositorio tokens;
    private final PasswordEncoder codificadorSenha;
    private final ContextoSeguranca contexto;
    private final ServicoUsuarioAutenticado servicoUsuario;
    private final RegistroRevogacoes revogacoes;
    private final ServicoHistorico historico;
    private final Armazenamento armazenamento;
    private final PropriedadesAplicacao propriedades;
    private final Environment ambiente;

    @Transactional(readOnly = true)
    public PainelSistema painel() {
        Runtime jvm = Runtime.getRuntime();
        String versao = getClass().getPackage().getImplementationVersion();
        var aplicacao = new PainelSistema.Aplicacao(
                versao == null ? "desenvolvimento" : versao,
                List.of(ambiente.getActiveProfiles()),
                System.getProperty("java.version"),
                Instant.ofEpochMilli(ManagementFactory.getRuntimeMXBean().getStartTime()),
                (jvm.totalMemory() - jvm.freeMemory()) / MB,
                jvm.maxMemory() / MB,
                armazenamento instanceof ArmazenamentoS3
                        ? "AWS S3 (" + propriedades.armazenamento().bucket() + ")"
                        : "Pasta local (desenvolvimento)");
        return new PainelSistema(consultas.contagens(), aplicacao, consultas.banco());
    }

    @Transactional(readOnly = true)
    public List<SessaoAtiva> sessoes() {
        return consultas.sessoesAtivas();
    }

    @Transactional
    public void encerrarSessoes(Long usuarioId) {
        Usuario usuario = outroUsuario(usuarioId);
        encerrar(usuario.getId());
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Sessões de \"%s\" encerradas pelo administrador do sistema.".formatted(usuario.nomeCompleto()), REF, usuarioId);
    }

    /** Derruba todo mundo, menos quem pediu. Devolve quantos usuários foram desconectados. */
    @Transactional
    public int encerrarTodasAsSessoes() {
        List<Long> conectados = tokens.usuariosComSessao(Instant.now(), contexto.usuario().id());
        conectados.forEach(this::encerrar);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Sessões de %d usuário(s) encerradas pelo administrador do sistema.".formatted(conectados.size()), null, null);
        return conectados.size();
    }

    /** Filtro da lista: todos, só ativos, só desativados ou só quem está com senha provisória. */
    public enum FiltroSituacao { TODOS, ATIVOS, DESATIVADOS, SENHA_PROVISORIA }

    @Transactional(readOnly = true)
    public Pagina<UsuarioSistema> usuarios(String busca, FiltroSituacao situacao, Pageable paginacao) {
        Boolean ativo = switch (situacao) {
            case ATIVOS, SENHA_PROVISORIA -> true;
            case DESATIVADOS -> false;
            case TODOS -> null;
        };
        Boolean trocarSenha = situacao == FiltroSituacao.SENHA_PROVISORIA ? true : null;
        Set<Long> conectados = consultas.usuariosConectados();
        var dono = propriedades.dono();
        return Pagina.de(usuarios.buscarEmTodasUnidades(Textos.busca(busca), ativo, trocarSenha, paginacao),
                u -> UsuarioSistema.de(u, conectados.contains(u.getId()), dono != null && dono.eh(u.getLogin())));
    }

    @Transactional(readOnly = true)
    public FichaUsuario ficha(Long id) {
        Usuario u = usuarios.findComCargoEUnidadeById(id).orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
        var dono = propriedades.dono();
        var dados = new FichaUsuario.Dados(u.getId(), u.getLogin(), u.getNome(), u.getFuncao(), u.getCargo().getNome(),
                u.getUnidade().getNome(), u.getUnidade().getTipo().name(), u.isAtivo(), u.isTrocarSenha(),
                dono != null && dono.eh(u.getLogin()), u.getCriadoEm(), u.getAtualizadoEm(),
                consultas.nomeDoUsuario(u.getCriadoPorId()), u.getUltimoAcessoEm());
        return new FichaUsuario(dados, consultas.sessoes(id), consultas.trabalho(id), consultas.atividade(id));
    }

    @Transactional
    public UsuarioDetalhe alterarSituacao(Long id, boolean ativo) {
        Usuario usuario = outroUsuario(id);
        usuario.setAtivo(ativo);
        if (!ativo) {
            encerrar(id);
        }
        servicoUsuario.esquecer(id);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Usuário \"%s\" %s pelo administrador do sistema.".formatted(usuario.nomeCompleto(), ativo ? "reativado" : "desativado"),
                REF, id);
        return UsuarioDetalhe.de(usuario);
    }

    @Transactional
    public void redefinirSenha(Long id, String senhaProvisoria) {
        Usuario usuario = outroUsuario(id);
        usuario.setSenhaHash(codificadorSenha.encode(senhaProvisoria));
        usuario.setTrocarSenha(true);
        encerrar(id);
        servicoUsuario.esquecer(id);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Senha de \"%s\" redefinida pelo administrador do sistema.".formatted(usuario.nomeCompleto()), REF, id);
    }

    @Transactional(readOnly = true)
    public List<EmpresaSistema> empresas() {
        return consultas.empresas(contexto.usuario().unidadeId());
    }

    /**
     * Cria a empresa (unidade raiz, isolada das demais) já com o administrador dela, que a partir
     * daí cadastra os próprios usuários, unidades e permissões pelas telas normais do sistema.
     */
    @Transactional
    public EmpresaSistema criarEmpresa(RequisicaoNovaEmpresa r) {
        String nome = Textos.limpo(r.nome());
        String login = r.login().strip();
        if (unidades.existsByUnidadePaiIsNullAndNomeIgnoreCase(nome)) {
            throw new RegraNegocioExcecao("Já existe uma empresa com esse nome.");
        }
        if (usuarios.existsByLoginIgnoreCase(login)) {
            throw new RegraNegocioExcecao("Esse login já está em uso.");
        }
        Cargo administrador = cargos.findByCodigo(Cargo.ADMINISTRADOR)
                .orElseThrow(() -> new IllegalStateException("Cargo Administrador não cadastrado no banco."));

        Unidade empresa = Unidade.empresa(nome);
        empresa.setCnpj(r.cnpj() == null || r.cnpj().isBlank() ? null : DocumentoFiscal.formatarCnpj(r.cnpj()));
        unidades.saveAndFlush(empresa);
        empresa.definirCaminho();

        Usuario usuario = new Usuario(contexto.usuario().id());
        usuario.setLogin(login);
        usuario.setSenhaHash(codificadorSenha.encode(r.senha()));
        usuario.setTrocarSenha(r.trocarSenha());
        usuario.setNome(Textos.limpo(r.administradorNome()));
        usuario.setCargo(administrador);
        usuario.setUnidade(empresa);
        usuarios.save(usuario);

        historico.registrar(ModuloHistorico.UNIDADES, AcaoHistorico.CRIACAO,
                "Empresa \"%s\" criada pelo administrador do sistema, com o acesso \"%s\".".formatted(nome, login),
                REF_EMPRESA, empresa.getId());
        return new EmpresaSistema(empresa.getId(), nome, empresa.getCnpj(), true, empresa.getCriadoEm(), usuario.getId(),
                login, usuario.getNome(), 1, 1, 1);
    }

    /** Desativar a empresa barra a entrada de todos os usuários dela e derruba quem está conectado. */
    @Transactional
    public void alterarSituacaoEmpresa(Long id, boolean ativo) {
        Unidade empresa = unidades.findById(id)
                .filter(u -> u.getUnidadePai() == null)
                .orElseThrow(() -> new NaoEncontradoExcecao("Empresa"));
        if (id.equals(contexto.usuario().unidadeId())) {
            throw new AcessoNegadoExcecao("A sua própria unidade não pode ser desativada por esta tela.");
        }
        empresa.setAtivo(ativo);
        if (!ativo) {
            usuarios.idsNaArvore(empresa.getCaminho()).forEach(this::encerrar);
        }
        servicoUsuario.esquecerTodos();
        historico.registrar(ModuloHistorico.UNIDADES, AcaoHistorico.EDICAO,
                "Empresa \"%s\" %s pelo administrador do sistema.".formatted(empresa.getNome(), ativo ? "reativada" : "desativada"),
                REF_EMPRESA, id);
    }

    /** Bloqueia a renovação (banco) e o JWT de acesso que ainda está valendo (memória). */
    private void encerrar(Long usuarioId) {
        tokens.revogarTodos(usuarioId);
        revogacoes.revogar(usuarioId);
    }

    private Usuario outroUsuario(Long id) {
        if (id.equals(contexto.usuario().id())) {
            throw new AcessoNegadoExcecao("Use a sua própria conta pelo menu do perfil, não por esta tela.");
        }
        return usuarios.findComCargoEUnidadeById(id).orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
    }
}
