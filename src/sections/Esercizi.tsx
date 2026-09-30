import { useState } from 'react'
import { useStore } from '../store/store'
import type { CatalogExercise, ExCategoria, ExSub } from '../types'
import { Button, Field, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/brand'

const CATS: ExCategoria[] = ['Active', 'Build', 'Control', 'Reset']
const SUBS: ExSub[] = ['Legs', 'Upper', 'Back', 'Core', 'Cardio']

export default function Esercizi() {
  const { state, deleteCatalogExercise } = useStore()
  const [cat, setCat] = useState<ExCategoria>('Active')
  const [open, setOpen] = useState<string | null>(null) // id esercizio espanso
  const [editing, setEditing] = useState<CatalogExercise | 'new' | null>(null)

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
              c === cat ? 'bg-teal text-[#1a1012]' : 'bg-surface2 text-muted'
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
        <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-muted">
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
              {items.map((e) => (
                <div key={e.id} className="rounded-2xl bg-surface2 ring-1 ring-white/[0.03]">
                  <button
                    onClick={() => setOpen(open === e.id ? null : e.id)}
                    className="flex w-full items-center gap-2 px-3 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{e.nome}</span>
                    {e.descrizione && (
                      <span className="text-muted">{open === e.id ? '▾' : '▸'}</span>
                    )}
                  </button>
                  {open === e.id && (
                    <div className="border-t border-white/[0.05] px-3 py-3">
                      {e.descrizione && (
                        <p className="text-sm leading-relaxed text-muted">{e.descrizione}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setEditing(e)}
                          className="flex items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-muted"
                        >
                          <Icon.edit size={14} /> Modifica
                        </button>
                        <button
                          onClick={() => confirm(`Eliminare ${e.nome}?`) && deleteCatalogExercise(e.id)}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-300"
                        >
                          <Icon.trash size={14} /> Elimina
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {editing && (
        <ExerciseCatalogEditor
          exercise={editing === 'new' ? null : editing}
          defaultCat={cat}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function ExerciseCatalogEditor({
  exercise,
  defaultCat,
  onClose,
}: {
  exercise: CatalogExercise | null
  defaultCat: ExCategoria
  onClose: () => void
}) {
  const { addCatalogExercise, updateCatalogExercise } = useStore()
  const [nome, setNome] = useState(exercise?.nome ?? '')
  const [categoria, setCategoria] = useState<ExCategoria>(exercise?.categoria ?? defaultCat)
  const [sub, setSub] = useState<ExSub>(exercise?.sub ?? 'Legs')
  const [descrizione, setDescrizione] = useState(exercise?.descrizione ?? '')

  const save = () => {
    const nm = nome.trim()
    if (!nm) return
    const data = { nome: nm, categoria, sub, descrizione: descrizione.trim() || undefined }
    if (exercise) updateCatalogExercise(exercise.id, data)
    else addCatalogExercise(data)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={exercise ? 'Modifica esercizio' : 'Nuovo esercizio'}>
      <div className="space-y-3">
        <Field label="Nome">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Es. Squat"
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
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
                  categoria === c ? 'bg-teal text-[#1a1012]' : 'bg-white/[0.06] text-muted'
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
            className="w-full resize-none rounded-2xl bg-surface2 px-4 py-3 text-sm leading-relaxed outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Button className="w-full" onClick={save}>
          {exercise ? 'Salva modifiche' : 'Aggiungi al catalogo'}
        </Button>
      </div>
    </Sheet>
  )
}
