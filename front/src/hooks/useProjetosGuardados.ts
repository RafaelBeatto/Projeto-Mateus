import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInteracao } from 'src/components/compartilhados/ProvedorInteracao';
import { useConsulta } from 'src/hooks/useConsulta';
import type { GestaoProjeto } from 'src/types/gestaoProjetos';
import { mensagemDeErro } from 'src/utils/erroApi';

/**
 * Estado das telas de projetos fora do Kanban (Arquivados, Lixeira): a lista, o projeto aberto
 * por ?projeto=ID e "tirar", que executa uma ação no back e, se der certo, tira o projeto da lista.
 */
export function useProjetosGuardados(carregar: () => Promise<GestaoProjeto[]>) {
  const { notificar } = useInteracao();
  const consulta = useConsulta(carregar);
  const { dados, definirDados } = consulta;

  const [parametros, setParametros] = useSearchParams();
  const projetoPedido = Number(parametros.get('projeto')) || null;
  const aberto = projetoPedido ? (dados?.find((x) => x.id === projetoPedido) ?? null) : null;
  useEffect(() => {
    // Projeto que não está (mais) nesta lista: volta para a lista.
    if (projetoPedido && dados && !aberto) setParametros({}, { replace: true });
  }, [projetoPedido, dados, aberto, setParametros]);

  const abrir = (p: GestaoProjeto) => setParametros({ projeto: String(p.id) });
  const fechar = () => setParametros({});

  const tirar = async (p: GestaoProjeto, acao: () => Promise<unknown>, mensagem: string) => {
    try {
      await acao();
      definirDados((lista) => (lista ?? []).filter((x) => x.id !== p.id));
      if (aberto?.id === p.id) fechar();
      notificar(mensagem);
    } catch (e) {
      notificar(mensagemDeErro(e), 'error');
    }
  };

  return { ...consulta, aberto, abrir, fechar, tirar };
}
