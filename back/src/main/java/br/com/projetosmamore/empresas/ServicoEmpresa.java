package br.com.projetosmamore.empresas;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.projetosmamore.comum.Textos;
import br.com.projetosmamore.comum.excecao.NaoEncontradoExcecao;
import br.com.projetosmamore.comum.excecao.RegraNegocioExcecao;
import br.com.projetosmamore.comum.validacao.DocumentoFiscal;
import br.com.projetosmamore.empresas.dto.EmpresaCriada;
import br.com.projetosmamore.empresas.dto.EmpresaResposta;
import br.com.projetosmamore.empresas.dto.RequisicaoEmpresa;
import br.com.projetosmamore.seguranca.ContextoSeguranca;
import br.com.projetosmamore.sistema.arquivo.ServicoArquivo;
import br.com.projetosmamore.sistema.historico.AcaoHistorico;
import br.com.projetosmamore.sistema.historico.ModuloHistorico;
import br.com.projetosmamore.sistema.historico.ServicoHistorico;
import br.com.projetosmamore.sistema.historico.dto.HistoricoResposta;
import lombok.RequiredArgsConstructor;

/**
 * Contratantes (tabela empresas.empresa). Mesmo CNPJ ou mesma razão social = mesmo contratante:
 * o cadastro devolve o existente em vez de duplicar, e a edição recusa repetir os de outro.
 */
@Service
@RequiredArgsConstructor
public class ServicoEmpresa {

    private static final String REF = "EMPRESA";

    private final EmpresaRepositorio empresas;
    private final EmpresaDocumentoRepositorio documentos;
    private final ContextoSeguranca contexto;
    private final ServicoHistorico historico;
    private final ServicoArquivo servicoArquivo;

    @Transactional(readOnly = true)
    public List<EmpresaResposta> itens() {
        return empresas.findByUnidadeIdOrderByRazaoSocialAsc(contexto.unidadeLeitura()).stream().map(EmpresaResposta::de).toList();
    }

    @Transactional(readOnly = true)
    public EmpresaResposta detalhe(Long id) {
        return EmpresaResposta.de(buscarParaLeitura(id));
    }

    @Transactional(readOnly = true)
    public List<HistoricoResposta> historicoDo(Long id) {
        Empresa e = buscarParaLeitura(id);
        return historico.doRegistro(e.getUnidadeId(), REF, id);
    }

    @Transactional
    public EmpresaCriada criar(RequisicaoEmpresa r) {
        Long unidadeId = contexto.unidadeEscrita();
        String razaoSocial = Textos.limpo(r.razaoSocial());
        String cnpj = cnpj(r.cnpj());
        Optional<Empresa> existente = mesmaEmpresa(unidadeId, cnpj, razaoSocial, null);
        if (existente.isPresent()) {
            return new EmpresaCriada(EmpresaResposta.de(existente.get()), true);
        }
        Empresa e = new Empresa(unidadeId, razaoSocial, Textos.limpo(r.nomeFantasia()), cnpj,
                Textos.limpo(r.telefone()), Textos.limpo(r.email()), Textos.limpo(r.endereco()),
                Textos.limpo(r.municipio()), Textos.maiusculo(r.uf()), Textos.limpo(r.representante()),
                null, null);
        empresas.save(e);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.CRIACAO,
                "Contratante \"%s\" cadastrado.".formatted(razaoSocial), REF, e.getId());
        return new EmpresaCriada(EmpresaResposta.de(e), false);
    }

    @Transactional
    public EmpresaResposta atualizar(Long id, RequisicaoEmpresa r) {
        Empresa e = buscarParaEscrita(id);
        String razaoSocial = Textos.limpo(r.razaoSocial());
        String cnpj = cnpj(r.cnpj());
        mesmaEmpresa(e.getUnidadeId(), cnpj, razaoSocial, id).ifPresent(outra -> {
            String pelo = cnpj != null && cnpj.equals(outra.getCnpj()) ? "CNPJ" : "nome";
            throw new RegraNegocioExcecao(
                    "Já existe outro contratante cadastrado com esse %s: \"%s\".".formatted(pelo, outra.getRazaoSocial()));
        });
        e.setRazaoSocial(razaoSocial);
        e.setNomeFantasia(Textos.limpo(r.nomeFantasia()));
        e.setCnpj(cnpj);
        e.setTelefone(Textos.limpo(r.telefone()));
        e.setEmail(Textos.limpo(r.email()));
        e.setEndereco(Textos.limpo(r.endereco()));
        e.setMunicipio(Textos.limpo(r.municipio()));
        e.setUf(Textos.maiusculo(r.uf()));
        e.setRepresentante(Textos.limpo(r.representante()));
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.EDICAO,
                "Dados do contratante \"%s\" atualizados.".formatted(razaoSocial), REF, id);
        return EmpresaResposta.de(e);
    }

    /** Os documentos antigos da ficha (de antes de a documentação sair) saem junto, com os arquivos. */
    @Transactional
    public void excluir(Long id) {
        Empresa e = buscarParaEscrita(id);
        String nome = e.getRazaoSocial();
        List<Long> arquivos = documentos.findByEmpresaIdOrderByNomeAsc(id).stream().map(EmpresaDocumento::getArquivoId)
                .toList();
        empresas.delete(e);
        arquivos.forEach(servicoArquivo::excluir);
        historico.registrar(ModuloHistorico.EMPRESAS, AcaoHistorico.EXCLUSAO,
                "Contratante \"%s\" excluído.".formatted(nome), REF, id);
    }

    /** Outro contratante da unidade com o mesmo CNPJ ou, senão, com a mesma razão social. */
    private Optional<Empresa> mesmaEmpresa(Long unidadeId, String cnpj, String razaoSocial, Long ignorarId) {
        Optional<Empresa> peloCnpj = cnpj == null ? Optional.empty() : empresas.findByUnidadeIdAndCnpj(unidadeId, cnpj);
        return peloCnpj.filter(outra -> !Objects.equals(outra.getId(), ignorarId))
                .or(() -> empresas.findByUnidadeIdAndRazaoSocialIgnoreCase(unidadeId, razaoSocial)
                        .filter(outra -> !Objects.equals(outra.getId(), ignorarId)));
    }

    /** O CNPJ fica sempre formatado, para a busca por igualdade funcionar. */
    private static String cnpj(String valor) {
        String limpo = Textos.limpo(valor);
        return limpo == null ? null : DocumentoFiscal.formatarCnpj(limpo);
    }

    private Empresa buscarParaLeitura(Long id) {
        Empresa e = empresas.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Contratante"));
        contexto.exigirLeitura(e.getUnidadeId());
        return e;
    }

    private Empresa buscarParaEscrita(Long id) {
        Empresa e = empresas.findById(id).orElseThrow(() -> new NaoEncontradoExcecao("Contratante"));
        contexto.exigirEscrita(e.getUnidadeId());
        return e;
    }
}
