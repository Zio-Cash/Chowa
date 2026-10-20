import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import type { CatalogExercise, ExCategoria, ExSub } from '../types'
import { Button, Field, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/brand'
import { deleteExImage, listExImages, saveExImage } from '../store/exImages'
import { resizeImage } from '../store/photos'

const CATS: ExCategoria[] = ['Active', 'Build', 'Control', 'Reset']
const SUBS: ExSub[] = ['Legs', 'Upper', 'Back', 'Core', 'Cardio']

export default function Esercizi() {
  const { state, deleteCatalogExercise } = useStore()
  const [cat, setCat] = useState<ExCategoria>('Active')
  const [open, setOpen] = useState<string | null>(null) // id esercizio espanso
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null)
  const [imgs, setImgs] = useState<Record<string, string>>({})

  const reloadImgs = () => listExImages().then(setImgs).catch(() => setImgs({}))
  useEffect(() => {
    reloadImgs()
  }, [])

  const list = state.exerciseCatalog.filter((e) => e.categoria === cat)

  return (
    <div className="space-y-4 pb-4">
      {/* Categorie */}
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

      <Button variant="soft" className="w-full" onClick={() => setEditing('new')}>
        <Icon.plus size={16} /> Nuovo esercizio
      </Button>

      {list.length === 0 && (
        <p className="rounded-2xl bg-black/[0.04] p-4 text-center text-sm text-muted">
          Nessun esercizio in questa categoria. Aggiungine uno.
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
                const img = imgs[e.id]
                const isOpen = open === e.id
                return (
                  <div key={e.id} className="overflow-hidden rounded-2xl bg-surface2 ring-1 ring-black/[0.03]">
                    <button
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <Thumb src={img} />
                      <span className="min-w-0 flex-1 truncate text-sm">{e.nome}</span>
                      <span className="text-muted">{isOpen ? '▾' : '▸'}</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-black/[0.05] px-3 py-3">
                        {img && (
                          <img
                            src={img}
                            alt={e.nome}
                            className="mb-3 max-h-72 w-full rounded-xl object-contain"
                          />
                        )}
                        {e.descrizione ? (
                          <p className="text-sm leading-relaxed text-muted">{e.descrizione}</p>
                        ) : (
                          !img && <p className="text-sm text-muted">Nessuna spiegazione o immagine.</p>
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
          image={editing !== 'new' ? imgs[editing.id] : undefined}
          defaultCat={cat}
          onClose={() => setEditing(null)}
          onImagesChanged={reloadImgs}
        />
      )}
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

/** Miniatura quadrata: immagine se presente, altrimenti un segnaposto con icona. */
function Thumb({ src }: { src?: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/[0.04] text-muted/50">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Icon.practice size={18} />}
    </span>
  )
}

function ExerciseCatalogEditor({
  exercise,
  image,
  defaultCat,
  onClose,
  onImagesChanged,
}: {
  exercise: CatalogExercise | null
  image?: string
  defaultCat: ExCategoria
  onClose: () => void
  onImagesChanged: () => void
}) {
  const { addCatalogExercise, updateCatalogExercise } = useStore()
  const [nome, setNome] = useState(exercise?.nome ?? '')
  const [categoria, setCategoria] = useState<ExCategoria>(exercise?.categoria ?? defaultCat)
  const [sub, setSub] = useState<ExSub>(exercise?.sub ?? 'Legs')
  const [descrizione, setDescrizione] = useState(exercise?.descrizione ?? '')
  // immagine: undefined = invariata, string = nuova, null = rimossa
  const [pending, setPending] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const preview = pending === undefined ? image : pending ?? undefined

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      // Le GIF restano animate (niente canvas); le foto vengono ridimensionate.
      setPending(file.type === 'image/gif' ? await readAsDataUrl(file) : await resizeImage(file, 640))
    } catch {
      alert('Non è stato possibile caricare l’immagine.')
    }
    setBusy(false)
  }

  const save = async () => {
    const nm = nome.trim()
    if (!nm) return
    const data = { nome: nm, categoria, sub, descrizione: descrizione.trim() || undefined }
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

  return (
    <Sheet open onClose={onClose} title={exercise ? 'Modifica esercizio' : 'Nuovo esercizio'}>
      <div className="space-y-3">
        <Field label="Immagine (opzionale)">
          <input ref={input} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="" className="max-h-56 w-full rounded-2xl bg-black/[0.03] object-contain" />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="flex items-center gap-1.5 rounded-xl bg-black/[0.05] px-3 py-1.5 text-xs font-medium text-muted"
                >
                  <Icon.edit size={14} /> Cambia
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-500"
                >
                  <Icon.trash size={14} /> Rimuovi
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 text-sm text-muted transition active:scale-[0.99]"
            >
              <Icon.plus size={20} />
              {busy ? 'Carico…' : 'Aggiungi foto o GIF'}
            </button>
          )}
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
          <Segmented<ExSub>
            options={SUBS.map((s) => ({ value: s, label: s }))}
            value={sub}
            onChange={setSub}
          />
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
        <p className="text-center text-[11px] text-muted">
          Le immagini restano salvate su questo dispositivo.
        </p>
      </div>
    </Sheet>
  )
}
