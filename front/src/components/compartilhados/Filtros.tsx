import { ReactNode } from 'react';
import { Badge, Box, Collapse, Fade, IconButton, Stack, Tooltip } from '@mui/material';
import { IconFilter } from '@tabler/icons-react';

const SEM_MOVIMENTO = '@media (prefers-reduced-motion: reduce)';

/**
 * Ícone de funil que abre/esconde os filtros: cresce ao passar o mouse e gira ao abrir.
 * "ativo" (algum filtro preenchido) deixa o ícone azul com um ponto, mesmo fechado.
 */
export const BotaoFiltros = ({
  aberto,
  ativo,
  aoAlternar,
  rotulo = 'Filtros',
}: {
  aberto: boolean;
  ativo: boolean;
  aoAlternar: () => void;
  rotulo?: string;
}) => (
  <Tooltip title={aberto ? 'Esconder filtros' : 'Filtrar'}>
    <IconButton
      size="small"
      aria-label={rotulo}
      aria-expanded={aberto}
      color={aberto || ativo ? 'primary' : 'default'}
      onClick={aoAlternar}
      sx={{
        transition: 'transform 150ms ease, background-color 150ms ease',
        '&:hover': { transform: 'scale(1.15)' },
        '&:active': { transform: 'scale(0.9)' },
        [SEM_MOVIMENTO]: { transition: 'none', '&:hover': { transform: 'none' } },
      }}
    >
      <Badge variant="dot" color="primary" invisible={!ativo}>
        <Box
          component="span"
          sx={{
            display: 'flex',
            transition: 'transform 250ms ease',
            transform: aberto ? 'rotate(180deg)' : 'none',
            [SEM_MOVIMENTO]: { transition: 'none' },
          }}
        >
          <IconFilter size={18} />
        </Box>
      </Badge>
    </IconButton>
  </Tooltip>
);

/** Campos de filtro que descem deslizando e aparecem aos poucos quando o BotaoFiltros abre. */
export const PainelFiltros = ({ aberto, children }: { aberto: boolean; children: ReactNode }) => (
  <Collapse in={aberto} timeout={250} unmountOnExit>
    <Fade in={aberto} timeout={400}>
      {/* pt: rótulos de campos (ex.: datas) ficam acima do campo e seriam cortados pelo Collapse. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        pt={1}
        mb={2}
        flexWrap="wrap"
        useFlexGap
      >
        {children}
      </Stack>
    </Fade>
  </Collapse>
);
