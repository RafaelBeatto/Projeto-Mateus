import { Fab } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';

/** Botão de criar fixo no canto da tela (celular). */
const BotaoFlutuante = ({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) => (
  <Fab
    color="primary"
    variant="extended"
    aria-label={rotulo}
    onClick={aoClicar}
    sx={{
      position: 'fixed',
      right: 16,
      bottom: 'calc(16px + env(safe-area-inset-bottom))',
      zIndex: 1100,
    }}
  >
    <IconPlus size={18} style={{ marginRight: 6 }} />
    {rotulo}
  </Fab>
);

export default BotaoFlutuante;
