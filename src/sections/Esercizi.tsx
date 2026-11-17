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
          { value: 'miei', label: 'Mine' },
          { value: 'libreria', label: 'Library' },
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

  // categoria/sotto-categoria non riconosciute (es. da un import) non devono
  // far sparire l'esercizio: finiscono in Build e nel gruppo "Other"
  const catOf = (e: CatalogExercise): ExCategoria => (CATS.includes(e.categoria) ? e.categoria : 'Build')
  const list = state.exerciseCatalog.filter((e) => catOf(e) === cat)
  const groups: { key: string; items: CatalogExercise[] }[] = [
    ...SUBS.map((sub) => ({ key: sub as string, items: list.filter((e) => e.sub === sub) })),
    { key: 'Other', items: list.filter((e) => !SUBS.includes(e.sub)) },
  ]
  const usedIn = (id: string) =>
    state.executionPlan.filter((d) => d.blocchi.some((b) => b.esercizi.some((x) => x.catalogId === id))).length
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
          <Icon.plus size={16} /> New
        </Button>
        <Button variant="soft" onClick={onOpenLibrary}>
          <Icon.search size={16} /> From library
        </Button>
      </div>

      {list.length === 0 && (
        <p className="rounded-2xl bg-black/[0.04] p-4 text-center text-sm text-muted">
          No exercises in this category yet. Add one, or pick one from the library.
        </p>
      )}

      {groups.map(({ key, items }) => {
        if (items.length === 0) return null
        return (
          <div key={key}>
            <div className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
              {key}
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
                      {isOpen ? <Icon.chevronUp size={14} className="text-muted" /> : <Icon.chevronDown size={14} className="text-muted" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-black/[0.05] px-3 py-3">
                        {imgs.length > 0 && <FlipImage srcs={imgs} alt={e.nome} />}
                        {e.descrizione ? (
                          <p className="mt-3 text-sm leading-relaxed text-muted">{e.descrizione}</p>
                        ) : (
                          imgs.length === 0 && <p className="text-sm text-muted">No description or image.</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setEditing(e)}
                            className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-3 py-1.5 text-xs font-medium text-muted"
                          >
                            <Icon.edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              const n = usedIn(e.id)
                              const msg = n
                                ? `Delete ${e.nome} from your exercises? It stays in your routine (${n} ${n === 1 ? 'day' : 'days'}).`
                                : `Delete ${e.nome}?`
                              if (!confirm(msg)) return
                              deleteCatalogExercise(e.id)
                              deleteExImage(e.id).then(reloadImgs)
                            }}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-shu"
                          >
                            <Icon.trash size={14} /> Delete
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
        Couldn’t load the library. You need a connection the first time.
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
          placeholder="Search (e.g. squat, row, plank)…"
          className="min-h-[44px] flex-1 bg-transparent outline-none"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FilterSelect label="Muscle" value={muscolo} onChange={setMuscolo} map={MUSCOLI} />
        <FilterSelect label="Equipment" value={attrezzo} onChange={setAttrezzo} map={ATTREZZI} />
        <FilterSelect label="Type" value={tipo} onChange={setTipo} map={TIPI} />
      </div>
      <div className="px-1 text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'exercise' : 'exercises'}</div>

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
            <span className="text-muted">{onPick ? <Icon.check size={16} /> : <Icon.chevronRight size={14} />}</span>
          </button>
        ))}
      </div>
      {shown < filtered.length && (
        <Button variant="ghost" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          Show more
        </Button>
      )}
      <p className="px-1 text-center text-[11px] text-muted">
        Images and data: Free Exercise DB (public domain)
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
    setDone('Added to your exercises')
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
        const blocchi = d.blocchi.length ? d.blocchi : [{ id: uid(), nome: 'Exercises', esercizi: [] }]
        const last = blocchi.length - 1
        return { ...d, blocchi: blocchi.map((b, i) => (i === last ? { ...b, esercizi: [...b.esercizi, ex] } : b)) }
      }),
    )
    setDone(`Added to ${day.nome}`)
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
              {showInstr ? 'Hide instructions' : 'How to do it'}
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
            Already in your exercises ({existing.categoria} · {existing.sub}).
          </p>
        ) : (
          <div className="space-y-2 rounded-2xl bg-black/[0.03] p-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Add to your exercises as</div>
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
              <Icon.plus size={16} /> Add to my exercises
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
                Add to routine
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
  // chiave stabile: l'array arriva nuovo a ogni render, il contenuto no
  const sig = srcs.join('|')
  useEffect(() => {
    if (sig.split('|').length < 2) return
    const t = window.setInterval(() => setK((v) => (v + 1) % 2), 900)
    return () => window.clearInterval(t)
  }, [sig])
  // spazio riservato (3:2): niente salto della pagina quando l'immagine arriva
  return (
    <div className="relative aspect-[3/2] max-h-[280px] w-full overflow-hidden rounded-2xl bg-surface2">
      {srcs.map((s, i) => (
        <img
          key={s}
          src={s}
          alt={alt}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            i === k % srcs.length ? 'opacity-100' : 'opacity-0'
          }`}
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
  const [categoria, setCategoria] = useState<ExCategoria>(
    exercise && CATS.includes(exercise.categoria) ? exercise.categoria : defaultCat,
  )
  const [sub, setSub] = useState<ExSub>(exercise && SUBS.includes(exercise.sub) ? exercise.sub : 'Legs')
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
      alert('Couldn’t load the image.')
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
      <Sheet open onClose={() => setPicking(false)} title="Choose from library">
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
    <Sheet open onClose={onClose} title={exercise ? 'Edit exercise' : 'New exercise'}>
      <div className="space-y-3">
        <Field label="Image">
          <input ref={input} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {preview && (
            <img src={preview} alt="" className="mb-2 max-h-48 w-full rounded-2xl bg-surface2 object-contain" />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal px-3 py-2 text-xs font-medium text-[#faf7f1]"
            >
              <Icon.search size={14} /> {libId ? 'Change from library' : 'Choose from library'}
            </button>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-3 py-2 text-xs font-medium text-muted"
            >
              <Icon.plus size={14} /> {busy ? 'Loading…' : 'Your photo or GIF'}
            </button>
            {(own || libId) && (
              <button
                type="button"
                onClick={() => {
                  if (own) setPending(null)
                  else setLibId('')
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-shu"
              >
                <Icon.trash size={14} /> Remove
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Library images show on all your devices; your own photos stay on this one.
          </p>
        </Field>
        <Field label="Name">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="e.g. Squat"
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Field label="Category">
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
        <Field label="Subcategory">
          <Segmented<ExSub> options={SUBS.map((s) => ({ value: s, label: s }))} value={sub} onChange={setSub} />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            rows={4}
            placeholder="How to perform the exercise…"
            className="w-full resize-none rounded-2xl bg-surface2 px-4 py-3 text-sm leading-relaxed outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Button className="w-full" onClick={save}>
          {exercise ? 'Save changes' : 'Add to catalog'}
        </Button>
      </div>
    </Sheet>
  )
}
