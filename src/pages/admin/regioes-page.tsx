import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { InlineName } from '@/components/inline-name'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  criarIgreja,
  criarRegiao,
  excluirIgreja,
  excluirRegiao,
  listRegioes,
  renomearIgreja,
  renomearRegiao,
  type RegiaoComIgrejas,
} from '@/lib/admin-api'

/** Executa a ação com toast de erro; true se deu certo */
async function tentar(acao: () => Promise<void>, sucesso?: string): Promise<boolean> {
  try {
    await acao()
    if (sucesso) toast.success(sucesso)
    return true
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Erro')
    return false
  }
}

function AddForm({
  placeholder,
  onAdd,
}: {
  placeholder: string
  onAdd: (nome: string) => Promise<boolean>
}) {
  const [nome, setNome] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Informe o nome')
      return
    }
    if (await onAdd(nome)) setNome('')
  }

  return (
    <form className="flex gap-2" onSubmit={(e) => void handleSubmit(e)}>
      <Input
        value={nome}
        placeholder={placeholder}
        className="h-10"
        onChange={(e) => setNome(e.target.value)}
      />
      <Button type="submit" variant="outline" className="h-10">
        <Plus className="size-4" />
        Adicionar
      </Button>
    </form>
  )
}

export function RegioesPage() {
  const [regioes, setRegioes] = useState<RegiaoComIgrejas[] | null>(null)

  const load = useCallback(async () => {
    try {
      setRegioes(await listRegioes())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(acao: () => Promise<void>, sucesso?: string) {
    const ok = await tentar(acao, sucesso)
    if (ok) await load()
    return ok
  }

  function rename(fn: (nome: string) => Promise<void>) {
    return (nome: string) => {
      if (!nome.trim()) {
        toast.error('Informe o nome')
        return Promise.resolve(false)
      }
      return act(() => fn(nome))
    }
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Regiões e igrejas
        </h1>
        <p className="text-sm text-muted-foreground">
          As igrejas da região aparecem no formulário de contribuição do ensaio.
        </p>
      </div>

      <AddForm
        placeholder="Nova região"
        onAdd={(nome) => act(() => criarRegiao(nome), 'Região criada')}
      />

      {regioes == null ? (
        <Loader2 className="mx-auto size-6 animate-spin" />
      ) : regioes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma região cadastrada.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {regioes.map((regiao) => (
            <Card key={regiao.id}>
              <CardHeader>
                <InlineName
                  nome={regiao.nome}
                  className="text-lg font-semibold"
                  deleteTitle={`Excluir a região ${regiao.nome}?`}
                  onRename={rename((nome) => renomearRegiao(regiao.id, nome))}
                  onDelete={() =>
                    void act(() => excluirRegiao(regiao.id), 'Região excluída')
                  }
                />
              </CardHeader>
              <CardContent className="grid gap-3">
                {regiao.igrejas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma igreja.</p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {regiao.igrejas.map((igreja) => (
                      <li key={igreja.id} className="px-3 py-1">
                        <InlineName
                          nome={igreja.nome}
                          className="text-sm"
                          deleteTitle={`Excluir a igreja ${igreja.nome}?`}
                          onRename={rename((nome) => renomearIgreja(igreja.id, nome))}
                          onDelete={() =>
                            void act(() => excluirIgreja(igreja.id), 'Igreja excluída')
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <AddForm
                  placeholder="Adicionar igreja"
                  onAdd={(nome) => act(() => criarIgreja(regiao.id, nome))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
