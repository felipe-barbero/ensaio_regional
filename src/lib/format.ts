/** AAAA-MM-DD → dd/MM/aaaa (sem passar por Date, evita fuso) */
export function formatData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
