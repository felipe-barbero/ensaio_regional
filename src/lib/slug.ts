/** Minúsculas, sem acentos, tudo que não for letra/número vira hífen */
export function normalizarSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** regiao-AAAA-MM-DD */
export function gerarSlug(regiao: string, data: string): string {
  return normalizarSlug(`${regiao}-${data}`)
}

/** Acrescenta -2, -3… até não colidir */
export function slugUnico(base: string, existentes: string[]): string {
  const usados = new Set(existentes)
  if (!usados.has(base)) return base
  let n = 2
  while (usados.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}
