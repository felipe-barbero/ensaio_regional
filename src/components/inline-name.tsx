import { useState, type FormEvent } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'

import { ConfirmButton } from '@/components/confirm-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Nome com renomear/excluir inline (usado em regiões e igrejas) */
export function InlineName({
  nome,
  deleteTitle,
  onRename,
  onDelete,
  className,
}: {
  nome: string
  deleteTitle: string
  onRename: (nome: string) => Promise<boolean>
  onDelete: () => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(nome)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (await onRename(value)) setEditing(false)
  }

  if (editing) {
    return (
      <form className="flex items-center gap-1" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          autoFocus
          value={value}
          className="h-9"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" size="icon" variant="ghost" aria-label="Salvar">
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Cancelar"
          onClick={() => {
            setValue(nome)
            setEditing(false)
          }}
        >
          <X className="size-4" />
        </Button>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <span className={className}>{nome}</span>
      <Button
        size="icon"
        variant="ghost"
        className="ml-auto"
        aria-label={`Renomear ${nome}`}
        onClick={() => {
          setValue(nome)
          setEditing(true)
        }}
      >
        <Pencil className="size-4" />
      </Button>
      <ConfirmButton title={deleteTitle} onConfirm={onDelete}>
        <Button size="icon" variant="ghost" aria-label={`Excluir ${nome}`}>
          <Trash2 className="size-4" />
        </Button>
      </ConfirmButton>
    </div>
  )
}
