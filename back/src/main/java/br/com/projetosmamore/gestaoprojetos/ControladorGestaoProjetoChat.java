package br.com.projetosmamore.gestaoprojetos;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.projetosmamore.acesso.permissao.Permissoes;
import br.com.projetosmamore.gestaoprojetos.dto.MensagemProjetoResposta;
import br.com.projetosmamore.gestaoprojetos.dto.RequisicaoMensagemProjeto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Chat próprio de cada projeto: quem vê o projeto lê e escreve no chat dele. */
@RestController
@RequestMapping("/api/gestao-projetos/{projetoId}/chat")
@PreAuthorize(Permissoes.GESTAO_PROJETO_LER)
@RequiredArgsConstructor
public class ControladorGestaoProjetoChat {

    private final ServicoGestaoProjetoChat servico;

    @GetMapping
    public List<MensagemProjetoResposta> mensagens(@PathVariable Long projetoId, @RequestParam(required = false) Long antesDeId,
            @RequestParam(required = false) Long depoisDeId) {
        return servico.mensagens(projetoId, antesDeId, depoisDeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MensagemProjetoResposta enviar(@PathVariable Long projetoId, @Valid @RequestBody RequisicaoMensagemProjeto requisicao) {
        return servico.enviar(projetoId, requisicao.texto());
    }
}
