package br.com.projetosmamore.acesso.usuario;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.autenticacao.TokenRenovacaoRepositorio;
import br.com.projetosmamore.acesso.cargo.Cargo;
import br.com.projetosmamore.acesso.cargo.CargoRepositorio;
import br.com.projetosmamore.acesso.unidade.Unidade;
import br.com.projetosmamore.acesso.unidade.UnidadeRepositorio;
import br.com.projetosmamore.acesso.usuario.dto.DadosPessoais;
import br.com.projetosmamore.acesso.usuario.dto.RequisicaoAtualizarUsuario;
import br.com.projetosmamore.acesso.usuario.dto.RequisicaoCriarUsuario;
import br.com.projetosmamore.acesso.usuario.dto.UsuarioDetalhe;
import br.com.projetosmamore.acesso.usuario.dto.UsuarioResumo;
import br.com.projetosmamore.comum.Textos;
import br.com.projetosmamore.comum.excecao.AcessoNegadoExcecao;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.comum.web.Pagina;
import br.com.projetosmamore.seguranca.ContextoSeguranca;
import br.com.projetosmamore.seguranca.ServicoUsuarioAutenticado;
import br.com.projetosmamore.seguranca.UsuarioAutenticado;
import br.com.projetosmamore.sistema.historico.AcaoHistorico;
import br.com.projetosmamore.sistema.historico.ModuloHistorico;
import br.com.projetosmamore.sistema.historico.ServicoHistorico;
import lombok.RequiredArgsConstructor;

/**
 * Cadastro de usuários pela hierarquia: na própria unidade, só cargos abaixo do seu;
 * em unidades subordinadas, qualquer cargo (exceto administrador do sistema).
 */
@Service
@RequiredArgsConstructor
public class ServicoUsuario {

    private static final String REF = "USUARIO";

    private final UsuarioRepositorio repositorio;
    private final CargoRepositorio cargos;
    private final UnidadeRepositorio unidades;
    private final TokenRenovacaoRepositorio tokens;
    private final PasswordEncoder codificadorSenha;
    private final ContextoSeguranca contexto;
    private final ServicoUsuarioAutenticado servicoUsuario;
    private final ServicoHistorico historico;

    @Transactional(readOnly = true)
    public Pagina<UsuarioResumo> listar(String busca, Pageable paginacao) {
        return Pagina.de(repositorio.buscar(contexto.unidadeLeitura(), Textos.busca(busca), paginacao), UsuarioResumo::de);
    }

    @Transactional(readOnly = true)
    public UsuarioDetalhe detalhe(Long id) {
        Usuario usuario = buscar(id);
        contexto.exigirLeitura(usuario.getUnidade().getId());
        return UsuarioDetalhe.de(usuario);
    }

    /** Cargos que o usuário logado pode atribuir na unidade informada. */
    @Transactional(readOnly = true)
    public List<Cargo> cargosAtribuiveis(Long unidadeId) {
        Unidade unidade = buscarUnidade(unidadeId == null ? contexto.usuario().unidadeId() : unidadeId);
        return cargos.findAllByOrderByNivelAscIdAsc().stream()
                .filter(cargo -> podeGerenciar(unidade, cargo))
                .toList();
    }

    @Transactional
    public UsuarioDetalhe criar(RequisicaoCriarUsuario requisicao) {
        String login = requisicao.login().strip();
        if (repositorio.existsByLoginIgnoreCase(login)) {
            throw new RegraNegocioExcecao("Esse login já está em uso.");
        }
        Usuario usuario = new Usuario(contexto.usuario().id());
        usuario.setLogin(login);
        usuario.setSenhaHash(codificadorSenha.encode(requisicao.senhaProvisoria()));
        usuario.setTrocarSenha(true);
        aplicar(usuario, requisicao);
        repositorio.save(usuario);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.CRIACAO,
                "Usuário \"%s\" (%s) criado como %s.".formatted(usuario.nomeCompleto(), login, usuario.getCargo().getNome()),
                REF, usuario.getId());
        return UsuarioDetalhe.de(usuario);
    }

    @Transactional
    public UsuarioDetalhe atualizar(Long id, RequisicaoAtualizarUsuario requisicao) {
        Usuario usuario = buscarGerenciavel(id);
        aplicar(usuario, requisicao);
        servicoUsuario.esquecer(id);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Usuário \"%s\" alterado.".formatted(usuario.nomeCompleto()), REF, id);
        return UsuarioDetalhe.de(usuario);
    }

    @Transactional
    public UsuarioDetalhe alterarSituacao(Long id, boolean ativo) {
        Usuario usuario = buscarGerenciavel(id);
        usuario.setAtivo(ativo);
        if (!ativo) {
            tokens.revogarTodos(id);
        }
        servicoUsuario.esquecer(id);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Usuário \"%s\" %s.".formatted(usuario.nomeCompleto(), ativo ? "reativado" : "desativado"), REF, id);
        return UsuarioDetalhe.de(usuario);
    }

    @Transactional
    public void redefinirSenha(Long id, String senhaProvisoria) {
        Usuario usuario = buscarGerenciavel(id);
        usuario.setSenhaHash(codificadorSenha.encode(senhaProvisoria));
        usuario.setTrocarSenha(true);
        tokens.revogarTodos(id);
        servicoUsuario.esquecer(id);
        historico.registrar(ModuloHistorico.USUARIOS, AcaoHistorico.EDICAO,
                "Senha de \"%s\" redefinida.".formatted(usuario.nomeCompleto()), REF, id);
    }

    private void aplicar(Usuario usuario, DadosPessoais dados) {
        Unidade unidade = buscarUnidade(dados.unidadeId() == null ? contexto.usuario().unidadeId() : dados.unidadeId());
        Cargo cargo = cargos.findById(dados.cargoId()).orElseThrow(() -> new NaoEncontradoExcecao("Cargo"));
        if (!podeGerenciar(unidade, cargo)) {
            throw new AcessoNegadoExcecao("Você só pode cadastrar cargos abaixo do seu na sua unidade, ou usuários das unidades subordinadas.");
        }
        if (!unidade.isAtivo()) {
            throw new RegraNegocioExcecao("A unidade escolhida está desativada.");
        }
        usuario.setNome(Textos.limpo(dados.nome()));
        usuario.setFuncao(Textos.limpo(dados.funcao()));
        usuario.setCargo(cargo);
        usuario.setUnidade(unidade);
    }

    /** Regra única da hierarquia, usada para listar cargos, criar, editar e desativar. */
    private boolean podeGerenciar(Unidade unidade, Cargo cargo) {
        UsuarioAutenticado eu = contexto.usuario();
        if (cargo.administradorSistema() || !eu.alcanca(unidade.getCaminho())) {
            return false;
        }
        return !unidade.getId().equals(eu.unidadeId()) || cargo.getNivel() > eu.nivelCargo();
    }

    private Usuario buscarGerenciavel(Long id) {
        Usuario usuario = buscar(id);
        contexto.exigirLeitura(usuario.getUnidade().getId());
        if (usuario.getId().equals(contexto.usuario().id()) || !podeGerenciar(usuario.getUnidade(), usuario.getCargo())) {
            throw new AcessoNegadoExcecao("Você não pode alterar este usuário.");
        }
        return usuario;
    }

    private Usuario buscar(Long id) {
        return repositorio.findComCargoEUnidadeById(id).orElseThrow(() -> new NaoEncontradoExcecao("Usuário"));
    }

    private Unidade buscarUnidade(Long id) {
        return unidades.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Unidade"));
    }
}
