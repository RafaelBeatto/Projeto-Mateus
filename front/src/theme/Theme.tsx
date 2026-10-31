import _ from 'lodash';
import { createTheme, Shadows, ThemeOptions } from '@mui/material/styles';
import { useSelector } from 'src/store/Store';
import { useEffect } from 'react';
import { AppState } from '../store/Store';
import components from './Components';
import typography from './Typography';
import { shadows, darkshadows } from './Shadows';
import { DarkThemeColors } from './DarkThemeColors';
import { LightThemeColors } from './LightThemeColors';
import { baseBlackTheme, baseDarkTheme, baselightTheme } from './DefaultColors';
import { ptBR } from '@mui/material/locale';

export const BuildTheme = (config: any = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const customizer = useSelector((state: AppState) => state.customizer);
  // O black é o noturno (modo "dark" do MUI) com fundos pretos por cima.
  const escuro = customizer.activeMode !== 'light';
  const defaultTheme = escuro ? baseDarkTheme : baselightTheme;
  const defaultShadow = escuro ? darkshadows : shadows;
  const themeSelect = escuro ? darkthemeOptions : themeOptions;
  const ajusteBlack = customizer.activeMode === 'black' ? baseBlackTheme : {};
  const baseMode: ThemeOptions = {
    palette: {
      mode: escuro ? 'dark' : 'light',
    },
    shape: {
      borderRadius: customizer.borderRadius,
    },
    shadows: defaultShadow as Shadows,
    typography: typography,
  };
  const opcoes: ThemeOptions = _.merge({}, baseMode, defaultTheme, themeSelect, ajusteBlack, {
    direction: config.direction,
  });
  const theme = createTheme(opcoes, ptBR);
  // Mescla (e não substitui) para manter os textos em português do locale ptBR.
  theme.components = _.merge({}, theme.components, components(theme));

  return theme;
};

const ThemeSettings = () => {
  const activDir = useSelector((state: AppState) => state.customizer.activeDir);
  const activeTheme = useSelector((state: AppState) => state.customizer.activeTheme);
  const theme = BuildTheme({
    direction: activDir,
    theme: activeTheme,
  });
  useEffect(() => {
    document.dir = activDir;
  }, [activDir]);

  return theme;
};

export { ThemeSettings };
