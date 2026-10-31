import Pagina from 'src/components/container/Pagina';
import TelaProjeto from 'src/components/apps/gestaoProjetos/TelaProjeto';
import ListaProjetosGuardados from 'src/components/apps/gestaoProjetos/ListaProjetosGuardados';
import { useProjetosGuardados } from 'src/hooks/useProjetosGuardados';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { GestaoProjeto } from 'src/types/gestaoProjetos';
import { formatarDataHora } from 'src/utils/formatacao';

/**
 * Projetos arquivados da Gestão de Projetos: saem do Kanban e ficam aqui, só para consulta,
 * do mais recente ao mais antigo. Desarquivar devolve o projeto à coluna em que estava.
 */
const Arquivados = () => {
  const { podeAlterar } = usePermissao();
  const { confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.GESTAO_PROJETO_ESCREVER);
  const { dados, carregando, erro, aberto, abrir, fechar, tirar } = useProjetosGuardados(
    servicoGestaoProjetos.listarArquivados,
  );

  const desarquivar = (p: GestaoProjeto) =>
    tirar(
      p,
      () => servicoGestaoProjetos.arquivar(p.id, false),
      `"${p.nome}" voltou para a Gestão de Projetos.`,
    );

  const excluir = async (p: GestaoProjeto) => {
    if (
      await confirmar(
        `Mover o projeto "${p.nome}" para a lixeira? Dá para restaurar depois, pela Lixeira.`,
        { rotuloConfirmar: 'Excluir', perigo: true },
      )
    )
      tirar(p, () => servicoGestaoProjetos.excluir(p.id), 'Projeto movido para a lixeira.');
  };

  return (
    <Pagina>
      {aberto ? (
        <TelaProjeto
          projeto={aberto}
          podeAlterar={false}
          aoVoltar={fechar}
          aoEditar={() => undefined}
          aoArquivar={alterar ? () => desarquivar(aberto) : undefined}
        />
      ) : (
        <ListaProjetosGuardados
          projetos={dados}
          carregando={carregando}
          erro={erro}
          rotuloBusca="nos arquivados"
          vazio='Nenhum projeto arquivado. Para arquivar, use "Arquivar" no menu do cartão ou na tela do projeto, na Gestão de Projetos.'
          detalhe={(p) => `Arquivado em ${formatarDataHora(p.arquivadoEm)}`}
          aoAbrir={abrir}
          acoes={(p) => [
            { rotulo: 'Desarquivar', aoClicar: () => desarquivar(p), oculta: !alterar },
            { rotulo: 'Excluir', perigo: true, aoClicar: () => excluir(p), oculta: !alterar },
          ]}
        />
      )}
    </Pagina>
  );
};

export default Arquivados;
