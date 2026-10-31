import { useEffect, useState } from 'react';
import _ from 'lodash';
import { Grid } from '@mui/material';
import { useFormikContext } from 'formik';
import DialogoFormulario from 'src/components/formularios/DialogoFormulario';
import CampoFormik from 'src/components/formularios/CampoFormik';
import { LIMITES } from 'src/constantes/limites';
import { servicoUsuarios, RequisicaoCriarUsuario } from 'src/servicos/usuarios';
import { useSelector } from 'src/store/Store';
import type { Cargo, UsuarioDetalhe } from 'src/types/acesso';
import { regras, Yup } from 'src/utils/validacao';

const esquemaBase = {
  nome: regras.obrigatorio(LIMITES.USUARIO_NOME),
  funcao: Yup.string().max(LIMITES.USUARIO_FUNCAO),
  unidadeId: Yup.number().required('Escolha a unidade'),
  cargoId: Yup.number().required('Escolha o cargo'),
};
const esquemaCriar = Yup.object({ ...esquemaBase, login: regras.login(), senhaProvisoria: regras.senha() });
const esquemaEditar = Yup.object(esquemaBase);

/** Cargos que posso atribuir na unidade do usuário (a dele ao editar, a minha ao criar — regra da hierarquia no back). */
const CampoCargo = () => {
  const { values, setFieldValue } = useFormikContext<RequisicaoCriarUsuario>();
  const [cargos, setCargos] = useState<Cargo[]>([]);

  useEffect(() => {
    if (values.unidadeId === '') return;
    servicoUsuarios.cargosAtribuiveis(Number(values.unidadeId)).then((lista) => {
      setCargos(lista);
      if (values.cargoId !== '' && !lista.some((c) => c.id === values.cargoId)) setFieldValue('cargoId', '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.unidadeId]);

  return (
    <CampoFormik
      name="cargoId"
      rotulo="Cargo"
      obrigatorio
      opcoes={cargos.map((c) => ({ valor: c.id, rotulo: c.nome }))}
      helperText={cargos.length ? undefined : 'Nenhum cargo disponível para você nesta unidade'}
    />
  );
};

interface Props {
  aberto: boolean;
  usuario: UsuarioDetalhe | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}

const FormularioUsuario = ({ aberto, usuario, aoFechar, aoSalvar }: Props) => {
  const eu = useSelector((s) => s.autenticacao.usuario);
  const editando = !!usuario;

  const valoresIniciais: RequisicaoCriarUsuario = {
    login: usuario?.login ?? '',
    senhaProvisoria: '',
    nome: usuario?.nome ?? '',
    funcao: usuario?.funcao ?? '',
    unidadeId: usuario?.unidadeId ?? eu?.unidade.id ?? '',
    cargoId: usuario?.cargoId ?? '',
  };

  return (
    <DialogoFormulario
      aberto={aberto}
      titulo={editando ? `Editar ${usuario!.nome}` : 'Novo usuário'}
      valoresIniciais={valoresIniciais}
      esquema={editando ? esquemaEditar : esquemaCriar}
      rotuloSalvar={editando ? 'Salvar alterações' : 'Cadastrar usuário'}
      largura="sm"
      aoFechar={aoFechar}
      aoEnviar={async (valores) => {
        if (editando) {
          await servicoUsuarios.atualizar(usuario!.id, _.omit(valores, ['login', 'senhaProvisoria']));
        } else {
          await servicoUsuarios.criar(valores);
        }
        aoSalvar();
      }}
    >
      <Grid container columnSpacing={3}>
        <Grid item xs={12}>
          <CampoFormik name="nome" rotulo="Nome" obrigatorio limite={LIMITES.USUARIO_NOME} />
        </Grid>
        {editando ? null : (
          <>
            <Grid item xs={12} sm={6}>
              <CampoFormik name="login" rotulo="Usuário (login)" obrigatorio limite={LIMITES.USUARIO_LOGIN} autoComplete="off" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CampoFormik
                name="senhaProvisoria"
                rotulo="Senha provisória"
                obrigatorio
                type="password"
                autoComplete="new-password"
                limite={LIMITES.SENHA_MAXIMO}
                helperText="A pessoa troca no primeiro acesso"
              />
            </Grid>
          </>
        )}
        <Grid item xs={12} sm={6}>
          <CampoCargo />
        </Grid>
        <Grid item xs={12} sm={6}>
          <CampoFormik
            name="funcao"
            rotulo="Função"
            limite={LIMITES.USUARIO_FUNCAO}
            placeholder="Ex.: Fonoaudióloga, Auxiliar administrativo"
            helperText="Escrita livre, só para identificação"
          />
        </Grid>
      </Grid>
    </DialogoFormulario>
  );
};

export default FormularioUsuario;
