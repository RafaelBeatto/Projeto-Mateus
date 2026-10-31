package br.com.projetosmamore.acesso.permissao;

/**
 * Códigos das permissões (tabela acesso.permissao; os mesmos do db/projetos-mamore.sql) prontos para @PreAuthorize.
 * Uso: {@code @PreAuthorize(Permissoes.USUARIO_ESCREVER)}.
 */
public final class Permissoes {

    private Permissoes() {
    }

    private static final String TEM = "hasAuthority('";
    private static final String FIM = "')";

    public static final String EMPRESA_LER = TEM + "EMPRESA_LER" + FIM;
    public static final String EMPRESA_ESCREVER = TEM + "EMPRESA_ESCREVER" + FIM;
    public static final String HISTORICO_LER = TEM + "HISTORICO_LER" + FIM;
    public static final String USUARIO_LER = TEM + "USUARIO_LER" + FIM;
    public static final String USUARIO_ESCREVER = TEM + "USUARIO_ESCREVER" + FIM;
    public static final String UNIDADE_LER = TEM + "UNIDADE_LER" + FIM;
    public static final String UNIDADE_ESCREVER = TEM + "UNIDADE_ESCREVER" + FIM;
    public static final String PERMISSAO_LER = TEM + "PERMISSAO_LER" + FIM;
    public static final String PERMISSAO_ESCREVER = TEM + "PERMISSAO_ESCREVER" + FIM;
    public static final String INSTITUICAO_ESCREVER = TEM + "INSTITUICAO_ESCREVER" + FIM;
    public static final String GESTAO_PROJETO_LER = TEM + "GESTAO_PROJETO_LER" + FIM;
    public static final String GESTAO_PROJETO_ESCREVER = TEM + "GESTAO_PROJETO_ESCREVER" + FIM;

    /** Não está na matriz (nem no banco): só o login configurado em aplicacao.dono.logins recebe. */
    public static final String CODIGO_DONO_SISTEMA = "DONO_SISTEMA";
    public static final String DONO_SISTEMA = TEM + CODIGO_DONO_SISTEMA + FIM;
}
