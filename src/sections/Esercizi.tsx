import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import type { CatalogExercise, ExCategoria, ExExercise, ExSub } from '../types'
import { Button, Field, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/brand'
import { deleteExImage, listExImages, saveExImage } from '../store/exImages'
import { resizeImage } from '../store/photos'
import { uid } from '../store/seed'
import {
  ATTREZZI,
  it,
  LIVELLI,
  libIdOf,
  libImages,
  loadLibrary,
  MUSCOLI,
  suggestCategory,
  TIPI,
  type LibExercise,
} from '../lib/exlib'

const CATS: ExCategoria[] = ['Active', 'Build', 'Control', 'Reset']
const SUBS: ExSub[] = ['Legs', 'Upper', 'Back', 'Core', 'Cardio']

export default function Esercizi() {
  const [view, setView] = useState<'miei' | 'libreria'>('miei')
  return (
    <div className="space-y-4 pb-4">
      <Segmented
        options={[
          { value: 'miei', label: 'I miei' },
          { value: 'libreria', label: 'Libreria' },
        ]}
        value={view}
        onChange={(v) => setView(v as 'miei' | 'libreria')}
      />
      {view === 'miei' ? <MyExercises onOpenLibrary={() => setView('libreria')} /> : <Library />}
    </div>
  )
}

// ===================== I MIEI =====================
function MyExercises({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { state, deleteCatalogExercise } = useStore()
  const [cat, setCat] = useState<ExCategoria>('Active')
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null)
  const [localImgs, setLocalImgs] = useState<Record<string, string>>({})

  const reloadImgs = () => listExImages().then(setLocalImgs).catch(() => setLocalImgs({}))
  useEffect(() => {
    reloadImgs()
  }, [])

  const list = state.exerciseCatalog.filter((e) => e.categoria === cat)
  // immagini: foto caricata da te (locale) > libreria (online, sincronizzata)
  const imagesOf = (e: CatalogExercise): string[] => {
    if (localImgs[e.id]) return [localImgs[e.id]]
    const lid = libIdOf(e)
    return lid ? libImages(lid) : []
  }

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-medium tracking-wide transition ${
              c === cat ? 'bg-teal text-[#faf7f1]' : 'bg-surface2 text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" onClick={() => setEditing('new')}>
          <Icon.plus size={16} /> Nuovo
        </Button>
        <Button variant="soft" onClick={onOpenLibrary}>
          <Icon.search size={16} /> Dalla libreria
        </Button>
      </div>

      {list.length === 0 && (
        <p className="rounded-2xl bg-black/[0.04] p-4 text-center text-sm text-muted">
          Nessun esercizio in questa categoria. Aggiungine uno o prendilo dalla libreria.
        </p>
      )}

      {SUBS.map((sub) => {
        const items = list.filter((e) => e.sub === sub)
        if (items.length === 0) return null
        return (
          <div key={sub}>
            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              {sub}
            </div>
            <div className="space-y-2">
              {items.map((e) => {
                const imgs = imagesOf(e)
                const isOpen = open === e.id
                return (
                  <div key={e.id} className="overflow-hidden rounded-2xl bg-surface2 ring-1 ring-black/[0.03]">
                    <button
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <Thumb src={imgs[0]} />
                      <span className="min-w-0 flex-1 truncate text-sm">{e.nome}</span>
                      <span className="text-muted">{isOpen ? '▾' : '▸'}</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-black/[0.05] px-3 py-3">
                        {imgs.length > 0 && <FlipImage srcs={imgs} alt={e.nome} />}
                        {e.descrizione ? (
                          <p className="mt-3 text-sm leading-relaxed text-muted">{e.descrizione}</p>
                        ) : (
                          imgs.length === 0 && <p className="text-sm text-muted">Nessuna spiegazione o immagine.</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setEditing(e)}
                            className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-3 py-1.5 text-xs font-medium text-muted"
                          >
                            <Icon.edit size={14} /> Modifica
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Eliminare ${e.nome}?`)) return
                              deleteCatalogExercise(e.id)
                              deleteExImage(e.id).then(reloadImgs)
                            }}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-500"
                          >
                            <Icon.trash size={14} /> Elimina
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {editing && (
        <ExerciseCatalogEditor
          exercise={editing === 'new' ? null : editing}
          localImage={editing !== 'new' ? localImgs[editing.id] : undefined}
          defaultCat={cat}
          onClose={() => setEditing(null)}
          onImagesChanged={reloadImgs}
        />
      )}
    </>
  )
}

// ===================== LIBRERIA =====================
const PAGE = 30

function Library({ onPick }: { onPick?: (x: LibExercise) => void }) {
  const [all, setAll] = useState<LibExercise[] | null>(null)
  const [err, setErr] = useState(false)
  const [q, setQ] = useState('')
  const [muscolo, setMuscolo] = useState('')
  const [attrezzo, setAttrezzo] = useState('')
  const [tipo, setTipo] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [detail, setDetail] = useState<LibExercise | null>(null)

  useEffect(() => {
    loadLibrary()
      .then(setAll)
      .catch(() => setErr(true))
  }, [])
  useEffect(() => setShown(PAGE), [q, muscolo, attrezzo, tipo])

  const filtered = useMemo(() => {
    if (!all) return []
    const s = q.trim().toLowerCase()
    return all.filter(
      (x) =>
        (!s || x.n.toLowerCase().includes(s)) &&
        (!muscolo || x.m.includes(muscolo)) &&
        (!attrezzo || x.e === attrezzo) &&
        (!tipo || x.c === tipo),
    )
  }, [all, q, muscolo, attrezzo, tipo])

  if (err)
    return (
      <p className="rounded-2xl bg-black/[0.04] p-4 text-center text-sm text-muted">
        Non riesco a caricare la libreria. Serve la connessione la prima volta.
      </p>
    )
  if (!all)
    return (
      <div className="flex justify-center py-10">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-black/10 border-t-teal" />
      </div>
    )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-surface2 px-4 ring-1 ring-black/[0.05] focus-within:ring-teal/30">
        <span className="text-muted">
          <Icon.search size={18} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca (es. squat, row, plank)…"
          className="min-h-[44px] flex-1 bg-transparent outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FilterSelect label="Muscolo" value={muscolo} onChange={setMuscolo} map={MUSCOLI} />
        <FilterSelect label="Attrezzo" value={attrezzo} onChange={setAttrezzo} map={ATTREZZI} />
        <FilterSelect label="Tipo" value={tipo} onChange={setTipo} map={TIPI} />
      </div>
      <div className="px-1 text-xs text-muted">{filtered.length} esercizi</div>

      <div className="space-y-2">
        {filtered.slice(0, shown).map((x) => (
          <button
            key={x.id}
            onClick={() => (onPick ? onPick(x) : setDetail(x))}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface2 px-3 py-2.5 text-left ring-1 ring-black/[0.03] active:scale-[0.99]"
          >
            <Thumb src={libImages(x.id)[0]} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{x.n}</span>
              <span className="block truncate text-[11px] text-muted">
                {x.m.map((m) => it(MUSCOLI, m)).join(', ')} · {it(ATTREZZI, x.e)}
              </span>
            </span>
            <span className="text-muted">{onPick ? <Icon.check size={16} /> : '▸'}</span>
          </button>
        ))}
      </div>
      {shown < filtered.length && (
        <Button variant="ghost" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          Mostra altri
        </Button>
      )}
      <p className="px-1 text-center text-[11px] text-muted">
        Immagini e dati: Free Exercise DB (pubblico dominio)
      </p>

      {detail && <LibDetail x={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  map,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  map: Record<string, string>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={`min-h-[40px] w-full truncate rounded-xl bg-surface2 px-2 text-xs ring-1 ring-black/[0.05] outline-none ${
        value ? 'text-ink' : 'text-muted'
      }`}
    >
      <option value="">{label}</option>
      {Object.entries(map)
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
    </select>
  )
}

function LibDetail({ x, onClose }: { x: LibExercise; onClose: () => void }) {
  const { state, addCatalogExercise, updateExecutionPlan } = useStore()
  const sugg = suggestCategory(x)
  const [categoria, setCategoria] = useState<ExCategoria>(sugg.categoria)
  const [sub, setSub] = useState<ExSub>(sugg.sub)
  const [dayId, setDayId] = useState(state.executionPlan[0]?.id ?? '')
  const [showInstr, setShowInstr] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const existing = state.exerciseCatalog.find((e) => libIdOf(e) === x.id)

  // Assicura che l'esercizio sia nel tuo catalogo e restituisce il suo id.
  const ensureInCatalog = (): CatalogExercise => {
    if (existing) return existing
    const id = addCatalogExercise({ nome: x.n, categoria, sub, libId: x.id })
    return { id, nome: x.n, categoria, sub, libId: x.id }
  }

  const addToMine = () => {
    ensureInCatalog()
    setDone('Aggiunto ai tuoi esercizi')
  }

  const addToDay = () => {
    const day = state.executionPlan.find((d) => d.id === dayId)
    if (!day) return
    const cat = ensureInCatalog()
    const ex: ExExercise = {
      id: uid(),
      catalogId: cat.id,
      nome: cat.nome,
      tipo: cat.sub === 'Cardio' || cat.categoria === 'Reset' || cat.categoria === 'Control' ? 'tempo' : 'reps',
      serie: 3,
      reps: 10,
      durataSec: 60,
      riposoSec: 60,
    }
    updateExecutionPlan((p) =>
      p.map((d) => {
        if (d.id !== dayId) return d
        const blocchi = d.blocchi.length ? d.blocchi : [{ id: uid(), nome: 'Esercizi', esercizi: [] }]
        const last = blocchi.length - 1
        return { ...d, blocchi: blocchi.map((b, i) => (i === last ? { ...b, esercizi: [...b.esercizi, ex] } : b)) }
      }),
    )
    setDone(`Aggiunto a ${day.nome}`)
  }

  return (
    <Sheet open onClose={onClose} title={x.n}>
      <div className="space-y-4">
        <FlipImage srcs={libImages(x.id)} alt={x.n} />
        <div className="flex flex-wrap gap-1.5 text-xs">
          {x.m.map((m) => (
            <span key={m} className="rounded-full bg-teal px-2.5 py-1 text-[#faf7f1]">
              {it(MUSCOLI, m)}
            </span>
          ))}
          {x.s.map((m) => (
            <span key={m} className="rounded-full bg-black/[0.06] px-2.5 py-1 text-muted">
              {it(MUSCOLI, m)}
            </span>
          ))}
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-muted">{it(ATTREZZI, x.e)}</span>
          <span className="rounded-full bg-black/[0.06] px-2.5 py-1 text-muted">{it(LIVELLI, x.l)}</span>
        </div>

        {x.i.length > 0 && (
          <div>
            <button onClick={() => setShowInstr((v) => !v)} className="text-sm font-medium text-teal">
              {showInstr ? 'Nascondi istruzioni' : 'Come si esegue (in inglese)'}
            </button>
            {showInstr && (
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
                {x.i.map((s, k) => (
                  <li key={k}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {existing ? (
          <p className="rounded-2xl bg-black/[0.04] px-3 py-2 text-sm text-muted">
            È già nei tuoi esercizi ({existing.categoria} · {existing.sub}).
          </p>
        ) : (
          <div className="space-y-2 rounded-2xl bg-black/[0.03] p-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Nei tuoi esercizi come</div>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  className={`min-h-[32px] rounded-full px-3 text-xs ${categoria === c ? 'bg-teal text-[#faf7f1]' : 'bg-black/[0.06] text-muted'}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Segmented<ExSub> options={SUBS.map((s) => ({ value: s, label: s }))} value={sub} onChange={setSub} />
          </div>
        )}

        <div className="space-y-2">
          {!existing && (
            <Button className="w-full" onClick={addToMine}>
              <Icon.plus size={16} /> Aggiungi ai miei esercizi
            </Button>
          )}
          {state.executionPlan.length > 0 && (
            <div className="flex gap-2">
              <select
                value={dayId}
                onChange={(e) => setDayId(e.target.value)}
                className="min-h-[46px] flex-1 rounded-2xl bg-surface2 px-3 text-sm ring-1 ring-black/[0.05] outline-none"
              >
                {state.executionPlan.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
              <Button variant="soft" onClick={addToDay}>
                Aggiungi alla scheda
              </Button>
            </div>
          )}
          {done && <p className="text-center text-sm font-medium text-verde">{done}</p>}
        </div>
      </div>
    </Sheet>
  )
}

// ===================== COMPONENTI =====================
/** Miniatura quadrata: immagine se presente, altrimenti un segnaposto con icona. */
function Thumb({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/[0.04] text-muted/50">
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <Icon.practice size={18} />
      )}
    </span>
  )
}

/** Alterna le due foto (partenza/arrivo) come una piccola animazione. */
function FlipImage({ srcs, alt }: { srcs: string[]; alt: string }) {
  const [k, setK] = useState(0)
  useEffect(() => {
    if (srcs.length < 2) return
    const t = window.setInterval(() => setK((v) => (v + 1) % srcs.length), 900)
    return () => window.clearInterval(t)
  }, [srcs])
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white">
      {srcs.map((s, i) => (
        <img
          key={s}
          src={s}
          alt={alt}
          className={`w-full object-contain transition-opacity duration-300 ${i === 0 ? 'relative' : 'absolute inset-0 h-full'} ${
            i === k ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ maxHeight: 280 }}
        />
      ))}
    </div>
  )
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

// ===================== EDITOR =====================
function ExerciseCatalogEditor({
  exercise,
  localImage,
  defaultCat,
  onClose,
  onImagesChanged,
}: {
  exercise: CatalogExercise | null
  localImage?: string
  defaultCat: ExCategoria
  onClose: () => void
  onImagesChanged: () => void
}) {
  const { addCatalogExercise, updateCatalogExercise } = useStore()
  const [nome, setNome] = useState(exercise?.nome ?? '')
  const [categoria, setCategoria] = useState<ExCategoria>(exercise?.categoria ?? defaultCat)
  const [sub, setSub] = useState<ExSub>(exercise?.sub ?? 'Legs')
  const [descrizione, setDescrizione] = useState(exercise?.descrizione ?? '')
  // '' = nessuna immagine dalla libreria (evita che l'abbinamento per nome la rimetta)
  const [libId, setLibId] = useState<string | undefined>(
    exercise?.libId === '' ? '' : exercise ? libIdOf(exercise) : undefined,
  )
  // foto tua: undefined = invariata, string = nuova, null = rimossa
  const [pending, setPending] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const own = pending === undefined ? localImage : pending ?? undefined
  const preview = own ?? (libId ? libImages(libId)[0] : undefined)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      setPending(file.type === 'image/gif' ? await readAsDataUrl(file) : await resizeImage(file, 640))
    } catch {
      alert('Non è stato possibile caricare l’immagine.')
    }
    setBusy(false)
  }

  const save = async () => {
    const nm = nome.trim()
    if (!nm) return
    const data = { nome: nm, categoria, sub, descrizione: descrizione.trim() || undefined, libId }
    let id = exercise?.id
    if (exercise) updateCatalogExercise(exercise.id, data)
    else id = addCatalogExercise(data)
    if (id && pending !== undefined) {
      if (pending) await saveExImage(id, pending)
      else await deleteExImage(id)
      onImagesChanged()
    }
    onClose()
  }

  if (picking)
    return (
      <Sheet open onClose={() => setPicking(false)} title="Scegli dalla libreria">
        <Library
          onPick={(x) => {
            setLibId(x.id)
            if (!nome.trim()) setNome(x.n)
            setPicking(false)
          }}
        />
      </Sheet>
    )

  return (
    <Sheet open onClose={onClose} title={exercise ? 'Modifica esercizio' : 'Nuovo esercizio'}>
      <div className="space-y-3">
        <Field label="Immagine">
          <input ref={input} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {preview && (
            <img src={preview} alt="" className="mb-2 max-h-48 w-full rounded-2xl bg-white object-contain" />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal px-3 py-2 text-xs font-medium text-[#faf7f1]"
            >
              <Icon.search size={14} /> {libId ? 'Cambia dalla libreria' : 'Scegli dalla libreria'}
            </button>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-3 py-2 text-xs font-medium text-muted"
            >
              <Icon.plus size={14} /> {busy ? 'Carico…' : 'Foto o GIF tua'}
            </button>
            {(own || libId) && (
              <button
                type="button"
                onClick={() => {
                  if (own) setPending(null)
                  else setLibId('')
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-500"
              >
                <Icon.trash size={14} /> Rimuovi
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Le immagini della libreria si vedono su tutti i dispositivi; le foto tue restano su questo.
          </p>
        </Field>
        <Field label="Nome">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Squat"
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Field label="Categoria">
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`min-h-[36px] rounded-full px-3 text-xs font-medium tracking-wide transition ${
                  categoria === c ? 'bg-teal text-[#faf7f1]' : 'bg-black/[0.06] text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Sottocategoria">
          <Segmented<ExSub> options={SUBS.map((s) => ({ value: s, label: s }))} value={sub} onChange={setSub} />
        </Field>
        <Field label="Spiegazione (opzionale)">
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            rows={4}
            placeholder="Come si esegue l'esercizio…"
            className="w-full resize-none rounded-2xl bg-surface2 px-4 py-3 text-sm leading-relaxed outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Button className="w-full" onClick={save}>
          {exercise ? 'Salva modifiche' : 'Aggiungi al catalogo'}
        </Button>
      </div>
    </Sheet>
  )
}
