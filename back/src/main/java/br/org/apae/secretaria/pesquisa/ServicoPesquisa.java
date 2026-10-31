package br.org.apae.secretaria.pesquisa;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.org.apae.secretaria.empresas.Empresa;
import br.org.apae.secretaria.empresas.EmpresaRepositorio;
import br.org.apae.secretaria.gestaoprojetos.GestaoProjeto;
import br.org.apae.secretaria.gestaoprojetos.GestaoProjetoRepositorio;
import br.org.apae.secretaria.pesquisa.dto.ResultadoPesquisa;
import br.org.apae.secretaria.pesquisa.dto.ResultadoPesquisa.TipoResultado;
import br.org.apae.secretaria.seguranca.ContextoSeguranca;
import br.org.apae.secretaria.seguranca.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

/**
 * Pesquisa geral (old/js/08-pesquisa-historico.js): procura o termo nos módulos que o usuário pode ler
 * (projetos da Gestão de Projetos e contratantes), sem diferenciar acento nem maiúscula, com pontuação
 * (igual 50, começa 25, contém 5 por ocorrência) × peso do campo.
 */
@Service
@RequiredArgsConstructor
public class ServicoPesquisa {

    private static final int MINIMO_CARACTERES = 2;
    private static final int MAXIMO_POR_TIPO = 25;

    private final GestaoProjetoRepositorio projetos;
    private final EmpresaRepositorio empresas;
    private final ContextoSeguranca contexto;

    /** Campo pesquisável com o seu peso. */
    private record Campo(String texto, double peso) {
        static Campo de(String texto, double peso) {
            return new Campo(texto, peso);
        }
    }

    @Transactional(readOnly = true)
    public List<ResultadoPesquisa> pesquisar(String termo) {
        String q = normalizar(termo);
        if (q.length() < MINIMO_CARACTERES) {
            return List.of();
        }
        Long unidadeId = contexto.unidadeLeitura();
        UsuarioAutenticado usuario = contexto.usuario();
        List<ResultadoPesquisa> resultado = new ArrayList<>();
        if (usuario.possui("GESTAO_PROJETO_LER")) {
            // Ativos e arquivados; os da lixeira ficam de fora.
            resultado.addAll(buscar(q, projetos.findByUnidadeIdAndExcluidoEmIsNull(unidadeId), TipoResultado.GESTAO_PROJETO,
                    GestaoProjeto::getId, GestaoProjeto::getNome,
                    p -> List.of(p.getArquivadoEm() != null ? "Arquivado" : "", p.getProcesso() == null ? "" : "Processo " + p.getProcesso(),
                            p.getContratante()),
                    p -> List.of(Campo.de(p.getNome(), 3), Campo.de(p.getProcesso(), 2), Campo.de(p.getContratante(), 1.5),
                            Campo.de(p.getConvenioNumero(), 1.5), Campo.de(p.getContratanteCidade(), 1),
                            Campo.de(p.getConvenioOrigem(), 1), Campo.de(p.getOrigemRecurso(), 1))));
        }
        if (usuario.possui("EMPRESA_LER")) {
            resultado.addAll(buscar(q, empresas.findByUnidadeIdOrderByRazaoSocialAsc(unidadeId), TipoResultado.EMPRESA,
                    Empresa::getId, e -> e.getRazaoSocial() != null ? e.getRazaoSocial() : e.getNomeFantasia(),
                    e -> List.of(e.getCnpj(), e.getMunicipio()),
                    e -> List.of(Campo.de(e.getRazaoSocial(), 3), Campo.de(e.getNomeFantasia(), 2), Campo.de(e.getCnpj(), 1.5),
                            Campo.de(e.getRepresentante(), 1), Campo.de(e.getMunicipio(), 1))));
        }
        return resultado;
    }

    /** Pontua cada item, descarta quem não casou e fica com os {@value #MAXIMO_POR_TIPO} melhores do tipo. */
    private <T> List<ResultadoPesquisa> buscar(String q, List<T> itens, TipoResultado tipo, Function<T, Long> id,
            Function<T, String> titulo, Function<T, List<String>> detalhes, Function<T, List<Campo>> campos) {
        return itens.stream()
                .map(item -> new Pontuado<>(item, campos.apply(item).stream().mapToDouble(c -> pontuar(c.texto(), q, c.peso())).sum()))
                .filter(p -> p.pontos() > 0)
                .sorted(Comparator.comparingDouble((Pontuado<T> p) -> p.pontos()).reversed())
                .limit(MAXIMO_POR_TIPO)
                .map(p -> new ResultadoPesquisa(tipo, id.apply(p.item()), titulo.apply(p.item()),
                        detalhes.apply(p.item()).stream().filter(d -> d != null && !d.isBlank()).toList()))
                .toList();
    }

    private record Pontuado<T>(T item, double pontos) {
    }

    private static double pontuar(String texto, String q, double peso) {
        if (texto == null || texto.isBlank()) {
            return 0;
        }
        String t = normalizar(texto);
        if (t.equals(q)) {
            return 50 * peso;
        }
        if (t.startsWith(q)) {
            return 25 * peso;
        }
        int ocorrencias = 0;
        for (int i = t.indexOf(q); i >= 0; i = t.indexOf(q, i + q.length())) {
            ocorrencias++;
        }
        return ocorrencias * 5 * peso;
    }

    /** Sem acento, sem maiúscula e sem espaços sobrando ("oficio" acha "Ofício"). */
    static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase().trim();
    }
}
