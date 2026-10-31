import { Typography } from '@mui/material';
import { useLocation, useSearchParams } from 'react-router-dom';
import { moduloPorCaminho } from 'src/routes/modulos';

/** Título da tela atual no cabeçalho; na Gestão de Projetos mostra o que se vê em cada nível. */
const TituloTela = () => {
  const { pathname } = useLocation();
  const [parametros] = useSearchParams();

  let titulo = moduloPorCaminho(pathname)?.titulo ?? '';
  // Gestão de Projetos: quadro de projetos → projeto (quadro de etapas) → etapa (tarefas).
  if (pathname.startsWith('/gestao-projetos')) {
    if (parametros.get('etapa')) titulo = 'Tarefa';
    else if (parametros.get('projeto')) titulo = 'Etapa';
    else titulo = 'Projeto';
  }

  return (
    <Typography variant="h5" color="textPrimary" noWrap sx={{ ml: 1 }}>
      {titulo}
    </Typography>
  );
};

export default TituloTela;
