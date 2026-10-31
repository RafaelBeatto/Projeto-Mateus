package br.org.apae.secretaria.gestaoprojetos;

import java.util.List;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.gestaoprojetos.dto.EtapaResposta;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicaoEtapa;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicaoStatusEtapa;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicoesTarefaEtapa;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/gestao-projetos/{projetoId}/etapas")
@RequiredArgsConstructor
public class ControladorGestaoProjetoEtapa {

    private final ServicoGestaoProjetoEtapa servico;

    @GetMapping
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<EtapaResposta> itens(@PathVariable Long projetoId) {
        return servico.itens(projetoId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta criar(@PathVariable Long projetoId, @Valid @RequestBody RequisicaoEtapa requisicao) {
        return servico.criar(projetoId, requisicao);
    }

    @PutMapping("/{etapaId}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta atualizar(@PathVariable Long projetoId, @PathVariable Long etapaId,
            @Valid @RequestBody RequisicaoEtapa requisicao) {
        return servico.atualizar(projetoId, etapaId, requisicao);
    }

    @PatchMapping("/{etapaId}/status")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta alterarStatus(@PathVariable Long projetoId, @PathVariable Long etapaId,
            @Valid @RequestBody RequisicaoStatusEtapa requisicao) {
        return servico.alterarStatus(projetoId, etapaId, requisicao.status());
    }

    @DeleteMapping("/{etapaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public void excluir(@PathVariable Long projetoId, @PathVariable Long etapaId) {
        servico.excluir(projetoId, etapaId);
    }

    // ---------- lista de tarefas da etapa ----------

    @PostMapping("/{etapaId}/tarefas")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta adicionarTarefa(@PathVariable Long projetoId, @PathVariable Long etapaId,
            @Valid @RequestBody RequisicoesTarefaEtapa.Dados requisicao) {
        return servico.adicionarTarefa(projetoId, etapaId, requisicao);
    }

    @PutMapping("/{etapaId}/tarefas/{tarefaId}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta atualizarTarefa(@PathVariable Long projetoId, @PathVariable Long etapaId, @PathVariable Long tarefaId,
            @Valid @RequestBody RequisicoesTarefaEtapa.Dados requisicao) {
        return servico.atualizarTarefa(projetoId, etapaId, tarefaId, requisicao);
    }

    @PatchMapping("/{etapaId}/tarefas/{tarefaId}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta marcarTarefa(@PathVariable Long projetoId, @PathVariable Long etapaId, @PathVariable Long tarefaId,
            @Valid @RequestBody RequisicoesTarefaEtapa.Marcar requisicao) {
        return servico.marcarTarefa(projetoId, etapaId, tarefaId, requisicao.feita());
    }

    @DeleteMapping("/{etapaId}/tarefas/{tarefaId}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public EtapaResposta removerTarefa(@PathVariable Long projetoId, @PathVariable Long etapaId, @PathVariable Long tarefaId) {
        return servico.removerTarefa(projetoId, etapaId, tarefaId);
    }
}
