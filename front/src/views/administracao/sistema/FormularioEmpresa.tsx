import { FormControlLabel, Grid, Typography } from '@mui/material';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import CustomCheckbox from 'src/components/forms/theme-elements/CustomCheckbox';
import { LIMITES } from 'src/constantes/limites';
import { servicoAdministracaoSistema } from 'src/servicos/administracaoSistema';
import type { RequisicaoNovaEmpresa } from 'src/types/administracaoSistema';
import { mascaraCnpj } from 'src/utils/formatacao';
import { regras, Yup } from 'src/utils/validacao';

const esquema = Yup.object({
  nome: regras.obrigatorio(LIMITES.UNIDADE_NOME),
  cnpj: regras.cnpj(),
  administradorNome: regras.obrigatorio(LIMITES.USUARIO_NOME),
  login: regras.login(),
  senha: regras.senha(),
});

const valoresIniciais: RequisicaoNovaEmpresa = {
  nome: '',
  cnpj: '',
  administradorNome: '',
  login: '',
  senha: '',
  trocarSenha: false,
};

const CampoTrocarSenha = () => {
  const { values, setFieldValue } = useFormikContext<RequisicaoNovaEmpresa>();
  return (
    <FormControlLabel
      control={<CustomCheckbox checked={values.trocarSenha} onChange={(_, marcado) => setFieldValue('trocarSenha', marcado)} />}
      label="Pedir para o administrador criar uma senha nova no primeiro acesso"
    />
  );
};

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: () => void;
}

/** Nova empresa com o acesso do administrador dela (login e senha definidos pelo dono). */
const FormularioEmpresa = ({ aberto, aoFechar, aoSalvar }: Props) => (
  <DialogoFormulario
    aberto={aberto}
    titulo="Nova empresa"
    valoresIniciais={valoresIniciais}
    esquema={esquema}
    rotuloSalvar="Cadastrar empresa"
    largura="sm"
    aoFechar={aoFechar}
    aoEnviar={async (valores) => {
      await servicoAdministracaoSistema.criarEmpresa(valores);
      aoSalvar();
    }}
  >
    <Grid container columnSpacing={3}>
      <Grid item xs={12} sm={8}>
        <CampoFormik name="nome" rotulo="Nome da empresa" obrigatorio limite={LIMITES.UNIDADE_NOME} />
      </Grid>
      <Grid item xs={12} sm={4}>
        <CampoFormik name="cnpj" rotulo="CNPJ" mascara={mascaraCnpj} placeholder="00.000.000/0000-00" inputProps={{ inputMode: 'numeric' }} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" mt={1} mb={0.5}>
          Acesso do administrador da empresa
        </Typography>
        <Typography variant="body2" color="textSecondary" mb={1}>
          Com este login ele cadastra os usuários, os cargos e as permissões da empresa.
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <CampoFormik name="administradorNome" rotulo="Nome do administrador" obrigatorio limite={LIMITES.USUARIO_NOME} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="login" rotulo="Usuário (login)" obrigatorio limite={LIMITES.USUARIO_LOGIN} autoComplete="off" />
      </Grid>
      <Grid item xs={12} sm={6}>
        <CampoFormik name="senha" rotulo="Senha" obrigatorio type="password" autoComplete="new-password" limite={LIMITES.SENHA_MAXIMO} />
      </Grid>
      <Grid item xs={12}>
        <CampoTrocarSenha />
      </Grid>
    </Grid>
  </DialogoFormulario>
);

export default FormularioEmpresa;
