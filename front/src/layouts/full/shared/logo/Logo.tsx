import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Box, styled, Typography } from '@mui/material';
import { useSelector } from 'src/store/Store';
import logoMamore from 'src/assets/images/logos/logo-mamore.svg';

/** Logo da Mamoré + nome do sistema (só o logo com o menu recolhido). */
const Logo: FC = () => {
  const customizer = useSelector((state) => state.customizer);
  const recolhido = customizer.isCollapse && !customizer.isSidebarHover;
  const LinkStyled = styled(Link)(() => ({
    height: customizer.TopbarHeight,
    width: recolhido ? '40px' : '220px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    textDecoration: 'none',
  }));

  return (
    <LinkStyled to="/">
      <Box component="img" src={logoMamore} alt="Mamoré" sx={{ width: 40, height: 40, objectFit: 'contain' }} />
      {recolhido ? null : (
        <Typography variant="h6" color="textPrimary" noWrap>
          Mamoré Construções
        </Typography>
      )}
    </LinkStyled>
  );
};

export default Logo;
