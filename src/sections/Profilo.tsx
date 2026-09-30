import { useRef, useState } from 'react'
import { useStore } from '../store/store'
import { useAuth } from '../auth/AuthProvider'
import { levelInfo } from '../lib/gamification'
import { masteryLabel } from '../lib/dojo'
import { dateKey, formatLong, parseKey } from '../lib/date'
import { currentCycle } from '../lib/cycle'
import { fmtSteps, fmtWater } from '../lib/goals'
import { getSnapshot, listSnapshots } from '../store/backup'
import { Button, Card, Field, Sheet } from '../components/ui'
import { Icon } from '../components/brand'
import SyncSheet from '../auth/SyncSheet'
import Progressi from './Progressi'
import Storico from './Storico'
import Calorie from './Calorie'

type Sub = 'progressi' | 'storico' | 'obiettivi' | 'settings'

const SUBS: { id: Sub; label: string; hint: string }[] = [
  { id: 'progressi', label: 'Progressi', hint: 'Peso e movimento nel tempo' },
  { id: 'storico', label: 'Percorso', hint: 'Il tuo diario, giorno per giorno' },
  { id: 'obiettivi', label: 'Equilibrio', hint: 'Calorie e obiettivi giornalieri' },
]

export default function Profilo() {
  const { state, exportData, importData, resetAll, setAccount } = useStore()
  const { user, signOut } = useAuth()
  const [sub, setSub] = useState<Sub | null>(null)
  const [sync, setSync] = useState(false)
  const [backup, setBackup] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const oggi = dateKey()
  const lvl = levelInfo(state.gamification.xp)
  const nome = state.account.nome?.trim() || (user?.displayName || '').trim() || 'Praticante'
  const avatar = state.account.avatar || user?.photoURL || null

  const targets = state.settings.targets
  const goals = state.settings.goals
  const cur = currentCycle(state.cycle, oggi)

  const weightKeys = Object.keys(state.weightLog).filter((k) => k <= oggi).sort()
  const pesoAttuale = weightKeys.length ? state.weightLog[weightKeys[weightKeys.length - 1]] : undefined
  const primoPeso = weightKeys.length ? state.weightLog[weightKeys[0]] : undefined
  const deltaPeso =
    pesoAttuale != null && primoPeso != null ? Math.round((pesoAttuale - primoPeso) * 10) / 10 : null

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chowa-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const doImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importData(String(reader.result))
      alert(ok ? 'Dati importati' : 'File non valido')
    }
    reader.readAsText(file)
  }

  // ── Sotto-schermate ──
  if (sub === 'settings') {
    return (
      <div className="pb-6">
        <BackHeader onBack={() => setSub(null)} title="Dati e impostazioni" />
        <Card className="!p-2">
          <Row label="Sincronizzazione" tone="teal" onClick={() => setSync(true)} />
          <Row label="Backup e ripristino" onClick={() => setBackup(true)} border />
          <Row label="Esporta dati" onClick={doExport} border />
          <Row label="Importa dati" onClick={() => fileRef.current?.click()} border />
          <Row
            label="Reset dati"
            tone="danger"
            border
            onClick={() => {
              if (confirm('Azzerare tutti i dati e ripartire dai seed?')) resetAll()
            }}
          />
        </Card>
        <button
          onClick={signOut}
          className="mt-4 w-full rounded-2xl bg-white/[0.05] py-3.5 text-sm font-medium tracking-wide text-muted transition active:scale-[0.99]"
        >
          Esci
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
        <SyncSheet open={sync} onClose={() => setSync(false)} />
        <BackupSheet open={backup} onClose={() => setBackup(false)} onExport={doExport} onRestore={importData} />
      </div>
    )
  }
  if (sub) {
    const titles: Record<string, string> = { progressi: 'Progressi', storico: 'Percorso', obiettivi: 'Equilibrio' }
    return (
      <div className="pb-6">
        <BackHeader onBack={() => setSub(null)} title={titles[sub]} />
        {sub === 'progressi' && <Progressi />}
        {sub === 'storico' && <Storico />}
        {sub === 'obiettivi' && <Calorie />}
      </div>
    )
  }

  // ── Overview ──
  return (
    <div className="space-y-4 pb-6">
      {/* Identità */}
      <div className="flex items-center gap-4 px-1 pt-1">
        <button onClick={() => setEditOpen(true)} className="relative shrink-0 active:scale-95" aria-label="Modifica profilo">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface2 font-display text-2xl text-teal ring-1 ring-white/10">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal text-[#1a1012] ring-2 ring-bg">
            <Icon.edit size={12} />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-medium tracking-tight">{nome}</h1>
          <div className="mt-0.5 text-sm text-muted">
            {masteryLabel(lvl.livello)} · Livello {lvl.livello}
          </div>
        </div>
      </div>

      {/* In sintesi */}
      <Card>
        <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">In sintesi</div>
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile
            label="Peso"
            value={pesoAttuale != null ? `${pesoAttuale} kg` : '—'}
            sub={deltaPeso != null ? `${deltaPeso > 0 ? '+' : deltaPeso < 0 ? '−' : ''}${Math.abs(deltaPeso).toFixed(1)} kg` : undefined}
            subTone={deltaPeso == null ? 'muted' : deltaPeso < 0 ? 'verde' : deltaPeso > 0 ? 'arancio' : 'muted'}
          />
          <StatTile label="Streak" value={`${state.gamification.streak}`} sub="giorni" />
          <StatTile label="Livello" value={`${lvl.livello}`} sub={masteryLabel(lvl.livello)} />
          {cur ? (
            <StatTile label="Ciclo" value={cur.phase.nome} sub={`Giorno ${cur.day}`} />
          ) : (
            <StatTile label="XP" value={`${lvl.inLevel}`} sub={`/ ${lvl.soglia}`} />
          )}
        </div>
      </Card>

      {/* Obiettivi */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Obiettivi</span>
          <button onClick={() => setSub('obiettivi')} className="text-xs text-teal">Modifica →</button>
        </div>
        <div className="space-y-1.5 text-sm">
          <ObjRow label="Calorie" value={`${targets.kcal} kcal`} />
          <ObjRow label="Macro" value={`P ${targets.proteine} · C ${targets.carboidrati} · G ${targets.grassi} g`} />
          <ObjRow label="Passi" value={fmtSteps(goals.stepTarget)} />
          <ObjRow label="Acqua" value={fmtWater(goals.waterTarget)} />
        </div>
      </Card>

      {/* Navigazione */}
      <Card className="!p-2">
        {SUBS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setSub(s.id)}
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-left transition active:scale-[0.99] ${
              i > 0 ? 'border-t border-white/[0.05]' : ''
            }`}
          >
            <span>
              <span className="block text-sm font-medium tracking-wide text-ink">{s.label}</span>
              <span className="block text-xs text-muted">{s.hint}</span>
            </span>
            <span className="text-muted">›</span>
          </button>
        ))}
      </Card>

      {/* Dati e impostazioni */}
      <Card className="!p-2">
        <button
          onClick={() => setSub('settings')}
          className="flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-left transition active:scale-[0.99]"
        >
          <span>
            <span className="block text-sm font-medium tracking-wide text-ink">Dati e impostazioni</span>
            <span className="block text-xs text-muted">Sincronizzazione, backup, export e reset</span>
          </span>
          <span className="text-muted">›</span>
        </button>
      </Card>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currentName={state.account.nome ?? ''}
        currentAvatar={state.account.avatar ?? ''}
        googleName={user?.displayName ?? ''}
        onSave={(nome, avatarData) => setAccount({ nome, avatar: avatarData })}
      />
    </div>
  )
}

function BackHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <button
      onClick={onBack}
      className="mb-4 flex items-center gap-1.5 text-sm text-muted transition active:scale-95"
    >
      ‹ <span className="tracking-wide">Profilo</span>
      <span className="ml-1 text-ink">· {title}</span>
    </button>
  )
}

function StatTile({
  label,
  value,
  sub,
  subTone = 'muted',
}: {
  label: string
  value: string
  sub?: string
  subTone?: 'muted' | 'verde' | 'arancio'
}) {
  const tone = subTone === 'verde' ? 'text-verde' : subTone === 'arancio' ? 'text-arancio' : 'text-muted'
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-1 truncate font-display text-lg tracking-tight">{value}</div>
      {sub && <div className={`font-mono text-[11px] tabular ${tone}`}>{sub}</div>}
    </div>
  )
}

function ObjRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono tabular">{value}</span>
    </div>
  )
}

// ===== Modifica profilo (nome + foto) =====
async function resizeImage(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const s = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function EditProfileSheet({
  open,
  onClose,
  currentName,
  currentAvatar,
  googleName,
  onSave,
}: {
  open: boolean
  onClose: () => void
  currentName: string
  currentAvatar: string
  googleName: string
  onSave: (nome: string, avatar: string) => void
}) {
  const [nome, setNome] = useState(currentName)
  const [avatar, setAvatar] = useState(currentAvatar)
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = avatar || null
  const pickPhoto = async (file: File) => {
    try {
      setAvatar(await resizeImage(file))
    } catch {
      alert('Immagine non valida.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Modifica profilo">
      <div className="mb-4 flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-white/10" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface2 font-display text-3xl text-teal ring-1 ring-white/10">
            {(nome || googleName || 'P').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button variant="soft" onClick={() => fileRef.current?.click()}>
            Cambia foto
          </Button>
          {avatar && (
            <button onClick={() => setAvatar('')} className="text-xs text-muted">
              Rimuovi foto
            </button>
          )}
        </div>
      </div>

      <Field label="Nome">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={googleName || 'Il tuo nome'}
          className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
        />
      </Field>
      {googleName && (
        <p className="mt-1 px-1 text-[11px] text-muted">Lascia vuoto per usare il nome dell'account ({googleName}).</p>
      )}

      <Button
        className="mt-4 w-full"
        onClick={() => {
          onSave(nome.trim(), avatar)
          onClose()
        }}
      >
        Salva
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])}
      />
    </Sheet>
  )
}

function BackupSheet({
  open,
  onClose,
  onExport,
  onRestore,
}: {
  open: boolean
  onClose: () => void
  onExport: () => void
  onRestore: (json: string) => boolean
}) {
  const snaps = open ? listSnapshots() : []

  const restore = (date: string) => {
    if (!confirm(`Ripristinare i dati salvati il ${formatLong(parseKey(date))}?\nLo stato attuale verrà sostituito.`)) return
    const data = getSnapshot(date)
    if (!data) return
    const ok = onRestore(JSON.stringify(data))
    alert(ok ? 'Dati ripristinati.' : 'Ripristino non riuscito.')
    if (ok) onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Backup e ripristino">
      <p className="mb-4 text-sm leading-relaxed text-muted">
        L'app salva da sola una copia di sicurezza ogni giorno (ultimi 14 giorni), sul dispositivo. Se
        qualcosa va storto, ripristini con un tap.
      </p>

      <Button variant="soft" className="mb-4 w-full" onClick={onExport}>
        Esporta un file di backup ora
      </Button>

      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        Copie automatiche
      </div>
      {snaps.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-muted">
          Nessuna copia ancora. Verrà creata automaticamente durante l'uso.
        </p>
      ) : (
        <div className="space-y-1.5">
          {snaps.map((s) => (
            <div key={s.date} className="flex items-center justify-between gap-2 rounded-2xl bg-surface2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm">{formatLong(parseKey(s.date))}</div>
                <div className="font-mono text-[11px] text-muted tabular">
                  {s.giorniDiario} gg diario · {s.giorniPeso} pesate
                </div>
              </div>
              <button
                onClick={() => restore(s.date)}
                className="shrink-0 rounded-xl bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal active:scale-95"
              >
                Ripristina
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function Row({
  label,
  onClick,
  tone,
  border,
}: {
  label: string
  onClick: () => void
  tone?: 'teal' | 'danger'
  border?: boolean
}) {
  const color = tone === 'teal' ? 'text-teal' : tone === 'danger' ? 'text-red-300' : 'text-ink'
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3.5 text-left transition active:scale-[0.99] ${
        border ? 'border-t border-white/[0.05]' : ''
      }`}
    >
      <span className={`text-sm font-medium tracking-wide ${color}`}>{label}</span>
      <span className="text-muted">›</span>
    </button>
  )
}
