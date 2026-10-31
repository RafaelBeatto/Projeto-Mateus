package br.com.projetosmamore.gestaoprojetos;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.acesso.usuario.UsuarioRepositorio;
import br.com.projetosmamore.comum.Limites;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.gestaoprojetos.dto.CoordenadorResposta;
import br.com.projetosmamore.gestaoprojetos.dto.MensagemProjetoResposta;
import br.com.projetosmamore.seguranca.ContextoSeguranca;
import lombok.RequiredArgsConstructor;

/**
 * Chat de cada projeto da Gestão de Projetos: uma conversa em grupo por projeto,
 * aberta a quem pode ver o projeto. A tela busca as mensagens novas periodicamente.
 */
@Service
@RequiredArgsConstructor
public class ServicoGestaoProjetoChat {

    private static final int LIMITE_MENSAGENS = 50;
    private static final int LIMITE_NOVAS = 200;

    private final ServicoGestaoProjeto servicoProjeto;
    private final GestaoProjetoMensagemRepositorio mensagens;
    private final UsuarioRepositorio usuarios;
    private final ContextoSeguranca contexto;

    /**
     * Em ordem de envio. Sem parâmetros: as últimas; "antesDeId": as anteriores a ela;
     * "depoisDeId": só as que chegaram depois dela.
     */
    @Transactional(readOnly = true)
    public List<MensagemProjetoResposta> mensagens(Long projetoId, Long antesDeId, Long depoisDeId) {
        servicoProjeto.buscarParaLeitura(projetoId);
        List<GestaoProjetoMensagem> lista;
        if (depoisDeId != null) {
            lista = mensagens.novas(projetoId, depoisDeId, PageRequest.of(0, LIMITE_NOVAS));
        } else {
            lista = new ArrayList<>(mensagens.recentes(projetoId, antesDeId == null ? 0 : antesDeId, PageRequest.of(0, LIMITE_MENSAGENS)));
            Collections.reverse(lista);
        }
        return respostas(lista);
    }

    @Transactional
    public MensagemProjetoResposta enviar(Long projetoId, String texto) {
        String conteudo = texto == null ? "" : texto.strip();
        if (conteudo.isEmpty() || conteudo.length() > Limites.MENSAGEM_TEXTO) {
            throw new RegraNegocioExcecao("A mensagem deve ter entre 1 e %d caracteres.".formatted(Limites.MENSAGEM_TEXTO));
        }
        servicoProjeto.buscarParaLeitura(projetoId);
        GestaoProjetoMensagem m = mensagens.save(new GestaoProjetoMensagem(projetoId, contexto.usuario().id(), conteudo));
        return respostas(List.of(m)).get(0);
    }

    private List<MensagemProjetoResposta> respostas(List<GestaoProjetoMensagem> lista) {
        Map<Long, CoordenadorResposta> pessoas = usuarios.findAllById(lista.stream().map(GestaoProjetoMensagem::getRemetenteId)
                .distinct().toList()).stream().map(CoordenadorResposta::de)
                .collect(Collectors.toMap(CoordenadorResposta::id, Function.identity()));
        return lista.stream().map(m -> MensagemProjetoResposta.de(m, pessoas.get(m.getRemetenteId()))).toList();
    }
}
