import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import PageContainer from './PageContainer';
import AvisoSomenteLeitura from 'src/components/compartilhados/AvisoSomenteLeitura';
import { moduloPorCaminho } from 'src/routes/modulos';

/**
 * Moldura padrão das telas: título da aba (routes/modulos.ts) e o aviso quando se consulta outra unidade.
 */
const Pagina = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const modulo = moduloPorCaminho(pathname);
  const titulo = modulo?.titulo ?? 'Mamoré Construções';

  return (
    <PageContainer title={`${titulo} · Mamoré Construções`} description={modulo?.subtitulo}>
      <AvisoSomenteLeitura />
      <>{children}</>
    </PageContainer>
  );
};

export default Pagina;
