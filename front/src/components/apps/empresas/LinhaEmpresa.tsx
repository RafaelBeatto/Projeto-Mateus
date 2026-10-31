import { Box, ListItemButton, Typography } from '@mui/material';
import type { Empresa } from 'src/types/empresas';

interface Props {
  empresa: Empresa;
  selecionada: boolean;
  aoAbrir: () => void;
}

/** Linha da lista: razão social e, embaixo, cidade, CNPJ, telefone e representante. */
const LinhaEmpresa = ({ empresa: e, selecionada, aoAbrir }: Props) => {
  const cidade = [e.municipio, e.uf].filter(Boolean).join('/');
  const meta = [cidade, e.cnpj && `CNPJ ${e.cnpj}`, e.telefone, e.representante && `Rep.: ${e.representante}`].filter(Boolean).join(' · ');

  return (
    <ListItemButton selected={selecionada} onClick={aoAbrir} sx={{ borderRadius: 1, py: 1, px: 1.5 }}>
      <Box flexGrow={1} minWidth={0}>
        <Typography variant="subtitle1" fontWeight={500} noWrap>
          {e.razaoSocial}
        </Typography>
        <Typography variant="caption" color="textSecondary" noWrap display="block">
          {meta || 'Sem dados adicionais'}
        </Typography>
      </Box>
    </ListItemButton>
  );
};

export default LinhaEmpresa;
