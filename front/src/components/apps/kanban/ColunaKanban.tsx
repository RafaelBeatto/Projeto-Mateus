import { FormEvent, ReactNode, useState } from 'react';
import { Box, Button, Chip, InputBase, Stack, Typography } from '@mui/material';
import { Droppable } from 'react-beautiful-dnd';
import SimpleBar from 'simplebar-react';
import { LIMITES } from 'src/constantes/limites';

interface Props {
  id: string;
  titulo: string;
  quantidade: number;
  corFundo: string;
  nota?: ReactNode;
  aoAdicionar?: (titulo: string) => Promise<boolean>;
  /** Texto do campo de criação rápida (padrão: "Nova tarefa"). */
  rotuloNovo?: string;
  /** Celular: coluna estreita para caberem duas na tela e dar para arrastar entre elas. */
  compacto?: boolean;
  children: ReactNode;
}

/**
 * Faixa rolável das colunas. No celular usa a rolagem nativa (dedo) em vez da SimpleBar:
 * o arrastar do quadro rola sozinho ao chegar na borda.
 */
export const RolagemQuadro = ({
  compacto = false,
  children,
}: {
  compacto?: boolean;
  children: ReactNode;
}) =>
  compacto ? (
    <Box
      display="flex"
      gap={1}
      pb={2}
      sx={{ overflowX: 'auto', mx: -2, px: 2, WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </Box>
  ) : (
    <SimpleBar>
      <Box display="flex" gap={2} pb={2}>
        {children}
      </Box>
    </SimpleBar>
  );

/** Coluna do quadro (mesma largura e cores por situação do CategoryTaskList do template). */
const ColunaKanban = ({
  id,
  titulo,
  quantidade,
  corFundo,
  nota,
  aoAdicionar,
  rotuloNovo = 'Nova tarefa',
  compacto = false,
  children,
}: Props) => {
  const [novo, setNovo] = useState('');

  const adicionar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = novo.trim();
    if (texto && aoAdicionar && (await aoAdicionar(texto))) setNovo('');
  };

  return (
    <Box
      width={compacto ? 168 : { xs: 260, sm: 280 }}
      flexShrink={0}
      p={compacto ? 1 : 2}
      sx={{ backgroundColor: corFundo, borderRadius: 1 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={compacto ? 1 : 2}
        spacing={0.5}
      >
        <Typography variant={compacto ? 'subtitle2' : 'h6'} fontWeight={600} noWrap>
          {titulo}
        </Typography>
        <Chip size="small" label={quantidade} />
      </Stack>
      {nota}
      <Droppable droppableId={id}>
        {(soltavel) => (
          <Box ref={soltavel.innerRef} {...soltavel.droppableProps} minHeight={60}>
            {children}
            {soltavel.placeholder}
          </Box>
        )}
      </Droppable>
      {aoAdicionar ? (
        <Stack component="form" direction="row" spacing={1} onSubmit={adicionar} mt={1}>
          <InputBase
            fullWidth
            placeholder={`＋ ${rotuloNovo}`}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            inputProps={{
              maxLength: LIMITES.TAREFA_TITULO,
              'aria-label': `${rotuloNovo} em ${titulo}`,
            }}
            sx={{ bgcolor: 'background.paper', px: 1, borderRadius: 1 }}
          />
          {novo.trim() ? (
            <Button type="submit" size="small" variant="contained">
              OK
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
};

export default ColunaKanban;
