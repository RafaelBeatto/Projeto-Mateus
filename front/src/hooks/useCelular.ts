import { Theme, useMediaQuery } from '@mui/material';

/** Tela de celular (abaixo do breakpoint "sm"): quadros em abas, botões de criar flutuantes. */
export const useCelular = () => useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
