package br.com.projetosmamore.sistema.administracao;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.projetosmamore.acesso.permissao.Permissoes;
import br.com.projetosmamore.acesso.usuario.dto.RequisicaoRedefinirSenha;
import br.com.projetosmamore.acesso.usuario.dto.RequisicaoSituacao;
import br.com.projetosmamore.acesso.usuario.dto.UsuarioDetalhe;
import br.com.projetosmamore.comum.web.Pagina;
import br.com.projetosmamore.sistema.administracao.dto.EmpresaSistema;
import br.com.projetosmamore.sistema.administracao.dto.FichaUsuario;
import br.com.projetosmamore.sistema.administracao.dto.RequisicaoNovaEmpresa;
import br.com.projetosmamore.sistema.administracao.dto.PainelSistema;
import br.com.projetosmamore.sistema.administracao.dto.SessaoAtiva;
import br.com.projetosmamore.sistema.administracao.dto.UsuarioSistema;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Tela "Administração do sistema": todas as rotas exigem ser o dono (aplicacao.dono.logins). */
@RestController
@RequestMapping("/api/administracao-sistema")
@PreAuthorize(Permissoes.DONO_SISTEMA)
@RequiredArgsConstructor
public class ControladorAdministracaoSistema {

    private final ServicoAdministracaoSistema servico;

    @GetMapping("/painel")
    public PainelSistema painel() {
        return servico.painel();
    }

    @GetMapping("/sessoes")
    public List<SessaoAtiva> sessoes() {
        return servico.sessoes();
    }

    @DeleteMapping("/sessoes/{usuarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void encerrarSessoes(@PathVariable Long usuarioId) {
        servico.encerrarSessoes(usuarioId);
    }

    @DeleteMapping("/sessoes")
    public Map<String, Integer> encerrarTodasAsSessoes() {
        return Map.of("encerradas", servico.encerrarTodasAsSessoes());
    }

    @GetMapping("/empresas")
    public List<EmpresaSistema> empresas() {
        return servico.empresas();
    }

    @PostMapping("/empresas")
    @ResponseStatus(HttpStatus.CREATED)
    public EmpresaSistema criarEmpresa(@Valid @RequestBody RequisicaoNovaEmpresa requisicao) {
        return servico.criarEmpresa(requisicao);
    }

    @PatchMapping("/empresas/{id}/situacao")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void alterarSituacaoEmpresa(@PathVariable Long id, @Valid @RequestBody RequisicaoSituacao requisicao) {
        servico.alterarSituacaoEmpresa(id, requisicao.ativo());
    }

    @GetMapping("/usuarios")
    public Pagina<UsuarioSistema> usuarios(@RequestParam(required = false) String busca,
            @RequestParam(defaultValue = "TODOS") ServicoAdministracaoSistema.FiltroSituacao situacao,
            @PageableDefault(size = 20, sort = "nome", direction = Sort.Direction.ASC) Pageable paginacao) {
        return servico.usuarios(busca, situacao, paginacao);
    }

    @GetMapping("/usuarios/{id}")
    public FichaUsuario ficha(@PathVariable Long id) {
        return servico.ficha(id);
    }

    @PatchMapping("/usuarios/{id}/situacao")
    public UsuarioDetalhe alterarSituacao(@PathVariable Long id, @Valid @RequestBody RequisicaoSituacao requisicao) {
        return servico.alterarSituacao(id, requisicao.ativo());
    }

    @PutMapping("/usuarios/{id}/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinirSenha(@PathVariable Long id, @Valid @RequestBody RequisicaoRedefinirSenha requisicao) {
        servico.redefinirSenha(id, requisicao.senhaProvisoria());
    }
}
