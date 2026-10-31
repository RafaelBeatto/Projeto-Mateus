import { Alert, Box, Button, Stack } from '@mui/material';
import { Form, Formik } from 'formik';
import { useLocation, useNavigate } from 'react-router-dom';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { useDispatch } from 'src/store/Store';
import { entrar, iniciarSessao } from 'src/store/autenticacao/AutenticacaoSlice';
import { sessao } from 'src/utils/axios';
import { credenciaisAdminLocal, sessaoLocal } from 'src/utils/modoLocal';
import { Yup } from 'src/utils/validacao';
import LayoutAutenticacao from './LayoutAutenticacao';

const esquema = Yup.object({
  login: Yup.string().trim().required('Informe o usuário').max(LIMITES.USUARIO_LOGIN),
  senha: Yup.string().required('Informe a senha').max(LIMITES.SENHA_MAXIMO),
});

/** O back responde (401 sem login)? Sem ele, o proxy do Vite devolve erro 5xx ou a rede falha. */
async function backNoAr() {
  try {
    const resposta = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/autenticacao/eu`);
    return resposta.status === 401 || resposta.status === 403 || resposta.ok;
  } catch {
    return false;
  }
}

/** Login por usuário e senha (contas são criadas por um superior, não há cadastro aberto). */
const Entrar = () => {
  const dispatch = useDispatch();
  const navegar = useNavigate();
  const origem = (useLocation().state as { de?: string } | null)?.de ?? '/';

  return (
    <LayoutAutenticacao titulo="Acessar o sistema" subtitulo="Entre com o usuário e a senha que você recebeu.">
      <Formik
        initialValues={{ login: '', senha: '' }}
        validationSchema={esquema}
        onSubmit={async (valores, { setStatus }) => {
          setStatus(undefined);
          const resultado = await dispatch(entrar({ login: valores.login.trim(), senha: valores.senha }));
          if (entrar.fulfilled.match(resultado)) {
            navegar(resultado.payload.trocarSenha ? '/trocar-senha' : origem, { replace: true });
          } else if (credenciaisAdminLocal(valores.login.trim(), valores.senha) && !(await backNoAr())) {
            // Desenvolvimento sem back: o admin entra na área de administração do modo local.
            sessao.definir(sessaoLocal(true));
            await dispatch(iniciarSessao());
            navegar('/', { replace: true });
          } else {
            setStatus(resultado.payload as string);
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form noValidate>
            {status ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {status}
              </Alert>
            ) : null}
            <Stack>
              <Box>
                <CampoFormik name="login" rotulo="Usuário" limite={LIMITES.USUARIO_LOGIN} autoComplete="username" autoFocus />
              </Box>
              <Box>
                <CampoFormik
                  name="senha"
                  rotulo="Senha"
                  type="password"
                  limite={LIMITES.SENHA_MAXIMO}
                  autoComplete="current-password"
                />
              </Box>
            </Stack>
            <Box mt={3}>
              <Button color="primary" variant="contained" size="large" fullWidth type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
              <Button
                color="inherit"
                variant="text"
                fullWidth
                sx={{ mt: 1 }}
                disabled={isSubmitting}
                onClick={async () => {
                  // Sem back e sem banco: os dados ficam guardados neste navegador.
                  sessao.definir(sessaoLocal());
                  await dispatch(iniciarSessao());
                  navegar(origem, { replace: true });
                }}
              >
                Entrar localmente (sem banco)
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </LayoutAutenticacao>
  );
};

export default Entrar;
