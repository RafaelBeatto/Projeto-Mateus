import { Button } from '@mui/material';
import { IconTrashX } from '@tabler/icons-react';
import Pagina from 'src/components/container/Pagina';
import TelaProjeto from 'src/components/apps/gestaoProjetos/TelaProjeto';
import ListaProjetosGuardados from 'src/components/apps/gestaoProjetos/ListaProjetosGuardados';
import { useProjetosGuardados } from 'src/hooks/useProjetosGuardados';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { usePermissao } from 'src/hooks/usePermissao';
import { PERMISSOES } from 'src/constantes/permissoes';
import { servicoGestaoProjetos } from 'src/servicos/gestaoProjetos';
import type { GestaoProjeto } from 'src/types/gestaoProjetos';
import { mensagemDeErro } from 'src/utils/erroApi';
import { formatarDataHora } from 'src/utils/formatacao';

/**
 * Lixeira da Gestão de Projetos: o que foi excluído (do Kanban ou dos Arquivados) fica aqui,
 * do mais recente ao mais antigo. Restaurar devolve o projeto para onde estava; "Excluir de vez" não tem volta.
 */
const Lixeira = () => {
  const { podeAlterar } = usePermissao();
  const { notificar, confirmar } = useInteracao();
  const alterar = podeAlterar(PERMISSOES.GESTAO_PROJETO_ESCREVER);
  const { dados, carregando, erro, definirDados, aberto, abrir, fechar, tirar } =
    useProjetosGuardados(servicoGestaoProjetos.lixeira);

  const restaurar = (p: GestaoProjeto) =>
    tirar(
      p,
      () => servicoGestaoProjetos.restaurar(p.id),
      `"${p.nome}" restaurado. Ele voltou ${p.arquivadoEm ? 'para os Arquivados' : 'para a Gestão de Projetos'}.`,
    );

  const excluirDeVez = async (p: GestaoProjeto) => {
    if (
      await confirmar(
        `Excluir de vez o projeto "${p.nome}"? Etapas, tarefas e chat também somem, e não dá para desfazer.`,
        { rotuloConfirmar: 'Excluir de vez', perigo: true },
      )
    )
      tirar(p, () => servicoGestaoProjetos.excluirDefinitivo(p.id), 'Projeto excluído de vez.');
  };

  const esvaziar = async () => {
    const total = dados?.length ?? 0;
    if (
      !(await confirmar(
        `Esvaziar a lixeira? ${total === 1 ? 'O projeto será excluído' : `Os ${total} projetos serão excluídos`} de vez, e não dá para desfazer.`,
        { rotuloConfirmar: 'Esvaziar lixeira', perigo: true },
      ))
    )
      return;
    try {
      const { excluidos } = await servicoGestaoProjetos.esvaziarLixeira();
      definirDados([]);
      notificar(
        excluidos === 1 ? '1 projeto excluído de vez.' : `${excluidos} projetos excluídos de vez.`,
      );
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return (
    <Pagina>
      {aberto ? (
        <TelaProjeto
          projeto={aberto}
          podeAlterar={false}
          aoVoltar={fechar}
          aoEditar={() => undefined}
          aoRestaurar={alterar ? () => restaurar(aberto) : undefined}
        />
      ) : (
        <ListaProjetosGuardados
          projetos={dados}
          carregando={carregando}
          erro={erro}
          rotuloBusca="na lixeira"
          vazio="A lixeira está vazia. Projetos excluídos na Gestão de Projetos ou nos Arquivados ficam aqui até serem restaurados ou excluídos de vez."
          detalhe={(p) =>
            `Excluído em ${formatarDataHora(p.excluidoEm)}${p.arquivadoEm ? ' · estava nos Arquivados' : ''}`
          }
          aoAbrir={abrir}
          acoes={(p) => [
            { rotulo: 'Restaurar', aoClicar: () => restaurar(p), oculta: !alterar },
            {
              rotulo: 'Excluir de vez',
              perigo: true,
              aoClicar: () => excluirDeVez(p),
              oculta: !alterar,
            },
          ]}
          extra={
            alterar ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<IconTrashX size={16} />}
                onClick={esvaziar}
                sx={{ flexShrink: 0 }}
              >
                Esvaziar lixeira
              </Button>
            ) : null
          }
        />
      )}
    </Pagina>
  );
};

export default Lixeira;
