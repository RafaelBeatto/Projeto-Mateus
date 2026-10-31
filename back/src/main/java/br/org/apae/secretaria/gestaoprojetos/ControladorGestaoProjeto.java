package br.org.apae.secretaria.gestaoprojetos;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
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

import br.org.apae.secretaria.acesso.permissao.Permissoes;
import br.org.apae.secretaria.gestaoprojetos.dto.CoordenadorResposta;
import br.org.apae.secretaria.gestaoprojetos.dto.EtapaResposta;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicaoArquivarGestaoProjeto;
import br.org.apae.secretaria.gestaoprojetos.dto.GestaoProjetoResposta;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicaoGestaoProjeto;
import br.org.apae.secretaria.gestaoprojetos.dto.RequisicaoStatusGestaoProjeto;
import br.org.apae.secretaria.sistema.historico.dto.HistoricoResposta;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/gestao-projetos")
@RequiredArgsConstructor
public class ControladorGestaoProjeto {

    private final ServicoGestaoProjeto servico;
    private final ServicoGestaoProjetoEtapa servicoEtapas;

    @GetMapping
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<GestaoProjetoResposta> itens(@RequestParam(defaultValue = "false") boolean arquivados) {
        return servico.itens(arquivados);
    }

    /** Histórico de todos os projetos (instantes: o navegador manda a meia-noite local de cada dia). */
    @GetMapping("/historico")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<HistoricoResposta> historicoGeral(@RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant desde,
            @RequestParam @DateTimeFormat(iso = ISO.DATE_TIME) Instant ate) {
        return servico.historicoGeral(desde, ate);
    }

    /** Projetos na lixeira (excluídos, ainda restauráveis). */
    @GetMapping("/lixeira")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<GestaoProjetoResposta> lixeira() {
        return servico.lixeira();
    }

    /** Exclui de vez tudo o que está na lixeira. */
    @DeleteMapping("/lixeira")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public Map<String, Integer> esvaziarLixeira() {
        return Map.of("excluidos", servico.esvaziarLixeira());
    }

    /** Etapas (com tarefas) de todos os projetos ativos: o Kanban geral junta projetos, etapas e tarefas. */
    @GetMapping("/etapas")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<EtapaResposta> etapasDosAtivos() {
        return servicoEtapas.dosProjetosAtivos();
    }

    @GetMapping("/coordenadores-disponiveis")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<CoordenadorResposta> coordenadoresDisponiveis() {
        return servico.coordenadoresDisponiveis();
    }

    @GetMapping("/{id}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public GestaoProjetoResposta detalhe(@PathVariable Long id) {
        return servico.detalhe(id);
    }

    @GetMapping("/{id}/historico")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
    public List<HistoricoResposta> historico(@PathVariable Long id) {
        return servico.historicoDo(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public GestaoProjetoResposta criar(@Valid @RequestBody RequisicaoGestaoProjeto requisicao) {
        return servico.criar(requisicao);
    }

    @PutMapping("/{id}")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public GestaoProjetoResposta atualizar(@PathVariable Long id, @Valid @RequestBody RequisicaoGestaoProjeto requisicao) {
        return servico.atualizar(id, requisicao);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public GestaoProjetoResposta alterarStatus(@PathVariable Long id,
            @Valid @RequestBody RequisicaoStatusGestaoProjeto requisicao) {
        return servico.alterarStatus(id, requisicao.status());
    }

    @PatchMapping("/{id}/arquivado")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public GestaoProjetoResposta arquivar(@PathVariable Long id, @RequestBody RequisicaoArquivarGestaoProjeto requisicao) {
        return servico.arquivar(id, requisicao.arquivado());
    }

    @PatchMapping("/{id}/restaurar")
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public GestaoProjetoResposta restaurar(@PathVariable Long id) {
        return servico.restaurar(id);
    }

    /** Só para projeto que já está na lixeira: exclui de vez, sem volta. */
    @DeleteMapping("/{id}/definitivo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public void excluirDefinitivo(@PathVariable Long id) {
        servico.excluirDefinitivo(id);
    }

    /** Manda para a lixeira (restaurável). */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(Permissoes.GESTAO_PROJETO_ESCREVER)
    public void excluir(@PathVariable Long id) {
        servico.excluir(id);
    }
}
