package br.com.projetosmamore.empresas;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.projetosmamore.acesso.permissao.Permissoes;
import br.com.projetosmamore.empresas.dto.EmpresaCriada;
import br.com.projetosmamore.empresas.dto.EmpresaResposta;
import br.com.projetosmamore.empresas.dto.RequisicaoEmpresa;
import br.com.projetosmamore.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/empresas")
@RequiredArgsConstructor
public class ControladorEmpresa {

    private final ServicoEmpresa servico;

    @GetMapping
    @PreAuthorize(Permissoes.EMPRESA_LER)
    public List<EmpresaResposta> itens() {
        return servico.itens();
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.EMPRESA_LER)
    public EmpresaResposta detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize(Permissoes.EMPRESA_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return servico.historicoDo(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.EMPRESA_ESCREVER)
    public EmpresaCriada criar(@Valid @RequestBody RequisicaoEmpresa requisicao) {
        return servico.criar(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.EMPRESA_ESCREVER)
    public EmpresaResposta atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoEmpresa requisicao) {
        return servico.atualizar(id, requisicao);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.EMPRESA_ESCREVER)
    public void excluir(@PathVariable Long id) {
        servico.excluir(id);
    }
}
