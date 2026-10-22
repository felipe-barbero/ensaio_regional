import type { MealKey } from '../data/ensaio.ts'

const BASE = '/ensaio_regional'

/** Link público do ensaio para enviar nos grupos */
export function ensaioUrl(
  slug: string,
  alvo: 'resumo' | MealKey,
  origin: string = window.location.origin,
): string {
  const sufixo = alvo === 'resumo' ? '' : `/${alvo}`
  return `${origin}${BASE}/e/${slug}${sufixo}`
}
