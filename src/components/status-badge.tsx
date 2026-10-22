import { Badge } from '@/components/ui/badge'
import type { StatusEnsaio } from '@/data/ensaio'

export function StatusBadge({ status }: { status: StatusEnsaio }) {
  return status === 'aberto' ? (
    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Aberto</Badge>
  ) : (
    <Badge variant="secondary">Encerrado</Badge>
  )
}
