import { useState } from 'react'
import { useStore } from '../store/store'
import { useAuth } from './AuthProvider'
import { Button, Card, Sheet } from '../components/ui'

function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard non disponibile
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-2xl bg-white/[0.06] px-3 py-2.5 font-mono text-xs text-ink">
        {code}
      </code>
      <Button variant="soft" onClick={copy} className="shrink-0 px-3">
        {copied ? 'Copiato' : 'Copia'}
      </Button>
    </div>
  )
}

export default function SyncSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut, setViewingUid } = useAuth()
  const { cloudViewers, addViewer, removeViewer, readOnly } = useStore()
  const [viewerCode, setViewerCode] = useState('')
  const [ownerCode, setOwnerCode] = useState('')

  if (!user) return null

  const onAddViewer = async () => {
    const v = viewerCode.trim()
    if (!v || v === user.uid) return
    await addViewer(v)
    setViewerCode('')
  }

  const startViewing = () => {
    const v = ownerCode.trim()
    if (!v || v === user.uid) return
    setViewingUid(v)
    setOwnerCode('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Sincronizzazione">
      <div className="space-y-3">
        <Card>
          <p className="text-xs text-muted">Account</p>
          <p className="font-semibold text-ink">{user.displayName ?? user.email}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <Button variant="ghost" className="mt-3 w-full" onClick={signOut}>
            Esci
          </Button>
        </Card>

        {readOnly ? (
          <Card>
            <p className="mb-2 text-sm text-ink">
              Stai guardando i dati di un'altra persona (sola lettura).
            </p>
            <Button className="w-full" onClick={() => setViewingUid(null)}>
              Torna ai miei dati
            </Button>
          </Card>
        ) : (
          <>
            <Card>
              <p className="mb-1 font-semibold text-ink">Il mio codice</p>
              <p className="mb-2 text-xs text-muted">
                Dallo a chi vuoi che veda i tuoi dati: lo inserirà nella sua app.
              </p>
              <CodeBox code={user.uid} />
            </Card>

            <Card>
              <p className="mb-1 font-semibold text-ink">Chi può vedere i miei dati</p>
              <p className="mb-2 text-xs text-muted">
                Incolla il codice della persona (lo trova nella sua app) per autorizzarla.
              </p>
              <div className="flex gap-2">
                <input
                  value={viewerCode}
                  onChange={(e) => setViewerCode(e.target.value)}
                  placeholder="Codice spettatore"
                  className="min-h-[44px] min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-3 font-mono text-xs outline-none"
                />
                <Button onClick={onAddViewer} className="shrink-0 px-4">
                  Aggiungi
                </Button>
              </div>
              {cloudViewers.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {cloudViewers.map((v) => (
                    <li key={v} className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{v}</code>
                      <button
                        onClick={() => removeViewer(v)}
                        className="shrink-0 text-xs text-red-400"
                      >
                        Rimuovi
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <p className="mb-1 font-semibold text-ink">Guarda i dati di qualcuno</p>
              <p className="mb-2 text-xs text-muted">
                Incolla il codice di chi ti ha autorizzato per vedere i suoi dati in tempo reale.
              </p>
              <div className="flex gap-2">
                <input
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  placeholder="Codice dell'altra persona"
                  className="min-h-[44px] min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-3 font-mono text-xs outline-none"
                />
                <Button onClick={startViewing} className="shrink-0 px-4">
                  Guarda
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>
    </Sheet>
  )
}
