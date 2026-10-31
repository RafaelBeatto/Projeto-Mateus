const real = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Props do campo de valor em reais (CampoFormik numérico com centavos). */
export const PROPS_VALOR = { type: 'number', inputProps: { min: 0, step: '0.01', inputMode: 'decimal' } } as const;

/** R$ 1.234,56 */
export const formatarMoeda = (valor: number | null | undefined) => real.format(Number(valor) || 0);
