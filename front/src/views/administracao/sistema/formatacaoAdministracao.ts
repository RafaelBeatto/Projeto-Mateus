/** "1536" → "1,5 KB" (tamanho de arquivos e do banco na área de administração). */
export function tamanhoEmBytes(bytes: number) {
  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: i ? 1 : 0 })} ${unidades[i]}`;
}
