export type DbError = { code?: string; message: string; details?: string | null }

/** Traduz erros do Postgres/PostgREST para mensagens do admin */
export function toMensagem(err: DbError): string {
  const texto = `${err.message} ${err.details ?? ''}`

  if (err.code === '23505') {
    if (texto.includes('slug')) return 'Já existe um ensaio com esse link'
    if (texto.includes('itens')) {
      return 'Já existe um item com esse nome nesta refeição'
    }
    if (texto.includes('regioes') || texto.includes('igrejas')) {
      return 'Já existe um cadastro com esse nome'
    }
  }
  if (err.code === '23503') {
    return 'Não é possível excluir: está em uso por ensaios ou contribuições'
  }
  if (err.code === '23514') return 'Valor inválido'
  return err.message
}
