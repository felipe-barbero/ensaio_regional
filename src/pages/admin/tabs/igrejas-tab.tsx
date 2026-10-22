import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatQty, MEAL_LABELS } from '@/data/ensaio'
import { resumoPorIgreja } from '@/lib/resumo-igrejas'
import type { EnsaioAdminData } from '@/pages/admin/ensaio-detail-page'

export function IgrejasTab({ data }: { data: EnsaioAdminData }) {
  const resumo = resumoPorIgreja(data.itens, data.igrejas, data.contribuicoes)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resumo.map((igreja) => (
        <Card key={igreja.igrejaId ?? 'sem'}>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between gap-2">
              <span>{igreja.nome}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {igreja.contribuicoes}{' '}
                {igreja.contribuicoes === 1 ? 'contribuição' : 'contribuições'} ·{' '}
                {igreja.pessoas} {igreja.pessoas === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {igreja.itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma contribuição ainda.</p>
            ) : (
              <ul className="divide-y text-sm">
                {igreja.itens.map(({ item, total }) => (
                  <li key={item.id} className="flex justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">
                      {item.nome}{' '}
                      <span className="text-muted-foreground">
                        · {MEAL_LABELS[item.refeicao]}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatQty(total, item.unidade)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
