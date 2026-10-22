import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/hooks/use-session'

export function LoginPage() {
  const { session, loading, signIn } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(email, senha)
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin · Ensaio Regional</CardTitle>
          <CardDescription>Entre com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                className="h-11 text-base"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-senha">Senha</Label>
              <Input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                className="h-11 text-base"
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
