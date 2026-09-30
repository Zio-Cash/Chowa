import { useState } from 'react'
import { useStore } from '../store/store'
import type { CatalogExercise, ExCategoria, ExDay, ExExercise } from '../types'
import { mmss } from '../lib/sound'
import { Button, Card, Sheet } from '../components/ui'
import { Icon } from '../components/brand'
import ExerciseEditor from '../components/ExerciseEditor'
import { uid } from '../store/seed'

const CATS: ExCategoria[] = ['Active', 'Build', 'Control', 'Reset']

const scheme = (ex: ExExercise) =>
  ex.tipo === 'reps' ? `${ex.serie}×${ex.reps}` : `${ex.serie} × ${mmss(ex.durataSec ?? 0)}`

export default function Routine() {
  const { state, updateExecutionPlan, addCatalogExercise } = useStore()
  const plan = state.executionPlan
  const [openDayId, setOpenDayId] = useState<string | null>(plan[0]?.id ?? null)
  const [picker, setPicker] = useState<{ dayId: string; blockId: string } | null>(null)
  const [editEx, setEditEx] = useState<{ dayId: string; blockId: string; ex: ExExercise } | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const mutateDay = (dayId: string, fn: (d: ExDay) => ExDay) =>
    updateExecutionPlan((p) => p.map((d) => (d.id === dayId ? fn(d) : d)))
  const mutateBlock = (dayId: string, blockId: string, fn: (b: ExDay['blocchi'][number]) => ExDay['blocchi'][number]) =>
    mutateDay(dayId, (d) => ({ ...d, blocchi: d.blocchi.map((b) => (b.id === blockId ? fn(b) : b)) }))

  const addDay = () => {
    const id = uid()
    updateExecutionPlan((p) => [...p, { id, nome: `Day ${p.length + 1}`, blocchi: [] }])
    setOpenDayId(id)
  }
  const deleteDay = (dayId: string) => updateExecutionPlan((p) => p.filter((d) => d.id !== dayId))
  const renameDay = (dayId: string, nome: string) => mutateDay(dayId, (d) => ({ ...d, nome }))

  const addBlock = (dayId: string) =>
    mutateDay(dayId, (d) => ({ ...d, blocchi: [...d.blocchi, { id: uid(), nome: 'Nuovo blocco', esercizi: [] }] }))
  const deleteBlock = (dayId: string, blockId: string) =>
    mutateDay(dayId, (d) => ({ ...d, blocchi: d.blocchi.filter((b) => b.id !== blockId) }))
  const renameBlock = (dayId: string, blockId: string, nome: string) =>
    mutateBlock(dayId, blockId, (b) => ({ ...b, nome }))

  const addExercise = (dayId: string, blockId: string, cat: CatalogExercise) => {
    const ex: ExExercise = {
      id: uid(),
      catalogId: cat.id,
      nome: cat.nome,
      // cardio, mobilità/stretching e controllo partono "a tempo"; forza a ripetizioni
      tipo:
        cat.sub === 'Cardio' || cat.categoria === 'Reset' || cat.categoria === 'Control'
          ? 'tempo'
          : 'reps',
      serie: 3,
      reps: 10,
      durataSec: 60,
      riposoSec: 60,
    }
    mutateBlock(dayId, blockId, (b) => ({ ...b, esercizi: [...b.esercizi, ex] }))
  }
  const saveExercise = (dayId: string, blockId: string, ex: ExExercise) =>
    mutateBlock(dayId, blockId, (b) => ({ ...b, esercizi: b.esercizi.map((e) => (e.id === ex.id ? ex : e)) }))
  const deleteExercise = (dayId: string, blockId: string, exId: string) =>
    mutateBlock(dayId, blockId, (b) => ({ ...b, esercizi: b.esercizi.filter((e) => e.id !== exId) }))

  // Importa un intero giorno da JSON, creando gli esercizi mancanti nel catalogo.
  const importDay = (json: string): boolean => {
    let parsed: {
      nome?: string
      blocchi?: {
        nome?: string
        esercizi?: {
          nome: string
          categoria?: ExCategoria
          sub?: CatalogExercise['sub']
          descrizione?: string
          tipo?: 'reps' | 'tempo'
          serie?: number
          reps?: number
          durataSec?: number
          carico?: number
          riposoSec?: number
          note?: string
        }[]
      }[]
    }
    try {
      parsed = JSON.parse(json)
    } catch {
      return false
    }
    if (!parsed || !Array.isArray(parsed.blocchi)) return false

    const byName = new Map(state.exerciseCatalog.map((c) => [c.nome.toLowerCase(), c]))
    const id = uid()
    const blocchi = parsed.blocchi.map((b) => ({
      id: uid(),
      nome: b.nome || 'Workout',
      esercizi: (b.esercizi ?? []).map((e) => {
        let catalogId = byName.get(e.nome.toLowerCase())?.id
        if (!catalogId) {
          catalogId = addCatalogExercise({
            nome: e.nome,
            categoria: e.categoria ?? 'Build',
            sub: e.sub ?? 'Legs',
            descrizione: e.descrizione,
          })
        }
        const tipo = e.tipo ?? (e.durataSec ? 'tempo' : 'reps')
        return {
          id: uid(),
          catalogId,
          nome: e.nome,
          tipo,
          serie: e.serie ?? 3,
          reps: e.reps ?? 10,
          durataSec: e.durataSec ?? 60,
          carico: e.carico,
          riposoSec: e.riposoSec ?? 60,
          note: e.note,
        } as ExExercise
      }),
    }))
    updateExecutionPlan((p) => [...p, { id, nome: parsed.nome || `Day ${p.length + 1}`, blocchi }])
    setOpenDayId(id)
    return true
  }

  return (
    <div className="space-y-3 pb-4">
      {plan.length === 0 && (
        <p className="rounded-2xl bg-white/[0.04] p-4 text-center text-sm text-muted">
          Nessun giorno. Crea il primo con “Aggiungi giorno”.
        </p>
      )}

      {plan.map((day) => {
        const isOpen = openDayId === day.id
        return (
          <Card key={day.id} className="!p-3">
            <div className="flex items-center gap-2">
              <input
                value={day.nome}
                onChange={(e) => renameDay(day.id, e.target.value)}
                className="min-w-0 flex-1 rounded-xl bg-transparent px-1 py-1 font-display text-base outline-none focus:bg-white/[0.04]"
              />
              <button
                onClick={() => confirm(`Eliminare ${day.nome}?`) && deleteDay(day.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-300"
                aria-label="Elimina giorno"
              >
                <Icon.trash size={16} />
              </button>
              <button
                onClick={() => setOpenDayId(isOpen ? null : day.id)}
                className="flex h-8 w-8 items-center justify-center text-muted"
                aria-label="Espandi"
              >
                {isOpen ? <Icon.chevronUp size={18} /> : <Icon.chevronDown size={18} />}
              </button>
            </div>

            {isOpen && (
              <div className="mt-3 space-y-4">
                {day.blocchi.map((b) => (
                  <div key={b.id}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <input
                        value={b.nome}
                        onChange={(e) => renameBlock(day.id, b.id, e.target.value)}
                        className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted outline-none focus:bg-white/[0.04]"
                      />
                      <button
                        onClick={() => deleteBlock(day.id, b.id)}
                        className="flex h-7 w-7 items-center justify-center text-muted"
                        aria-label="Elimina blocco"
                      >
                        <Icon.close size={15} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {b.esercizi.map((ex) => (
                        <div key={ex.id} className="flex items-center gap-2 rounded-2xl bg-surface2 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">{ex.nome}</div>
                            <div className="font-mono text-[11px] text-muted tabular">
                              {scheme(ex)}
                              {ex.carico ? ` · ${ex.carico} kg` : ''}
                              {ex.note ? ` · ${ex.note}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditEx({ dayId: day.id, blockId: b.id, ex })}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-muted"
                            aria-label="Modifica"
                          >
                            <Icon.edit size={15} />
                          </button>
                          <button
                            onClick={() => deleteExercise(day.id, b.id, ex.id)}
                            className="flex h-8 w-8 items-center justify-center text-muted"
                            aria-label="Rimuovi"
                          >
                            <Icon.close size={15} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setPicker({ dayId: day.id, blockId: b.id })}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-sm text-muted"
                      >
                        <Icon.plus size={16} /> Esercizio dal catalogo
                      </button>
                    </div>
                  </div>
                ))}
                <Button variant="soft" className="w-full" onClick={() => addBlock(day.id)}>
                  <Icon.plus size={16} /> Aggiungi blocco
                </Button>
              </div>
            )}
          </Card>
        )
      })}

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={addDay}>
          <Icon.plus size={16} /> Aggiungi giorno
        </Button>
        <Button variant="soft" onClick={() => setImportOpen(true)}>
          Importa giorno
        </Button>
      </div>

      {importOpen && (
        <ImportDaySheet
          onImport={importDay}
          onClose={() => setImportOpen(false)}
        />
      )}
      {picker && (
        <CatalogPicker
          onPick={(cat) => addExercise(picker.dayId, picker.blockId, cat)}
          onClose={() => setPicker(null)}
        />
      )}
      {editEx && (
        <ExerciseEditor
          ex={editEx.ex}
          onSave={(ex) => {
            saveExercise(editEx.dayId, editEx.blockId, ex)
            setEditEx(null)
          }}
          onClose={() => setEditEx(null)}
        />
      )}
    </div>
  )
}

function ImportDaySheet({
  onImport,
  onClose,
}: {
  onImport: (json: string) => boolean
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const doImport = () => {
    if (onImport(text.trim())) {
      onClose()
    } else {
      alert('Testo non valido: controlla di aver incollato tutto.')
    }
  }
  return (
    <Sheet open onClose={onClose} title="Importa giorno">
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Incolla qui il testo del giorno (formato JSON). Gli esercizi mancanti verranno creati
        automaticamente nel catalogo.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder='{"nome":"Day 3","blocchi":[…]}'
        className="w-full resize-none rounded-2xl bg-surface2 px-4 py-3 font-mono text-xs leading-relaxed outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
      />
      <Button className="mt-3 w-full" onClick={doImport}>
        Importa
      </Button>
    </Sheet>
  )
}

function CatalogPicker({
  onPick,
  onClose,
}: {
  onPick: (cat: CatalogExercise) => void
  onClose: () => void
}) {
  const { state } = useStore()
  const [cat, setCat] = useState<ExCategoria>('Active')
  const [q, setQ] = useState('')
  const [added, setAdded] = useState<string[]>([])

  const list = q.trim()
    ? state.exerciseCatalog.filter((e) => e.nome.toLowerCase().includes(q.toLowerCase()))
    : state.exerciseCatalog.filter((e) => e.categoria === cat)

  const pick = (e: CatalogExercise) => {
    onPick(e)
    setAdded((a) => [...a, e.id])
  }

  return (
    <Sheet open onClose={onClose} title="Aggiungi dal catalogo">
      <div>
        <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface2 px-4 ring-1 ring-white/[0.05] focus-within:ring-teal/30">
          <span className="text-muted">
            <Icon.search size={18} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca esercizio…"
            className="min-h-[44px] flex-1 bg-transparent outline-none"
          />
        </div>
        {!q.trim() && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`min-h-[34px] shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-medium tracking-wide transition ${
                  c === cat ? 'bg-teal text-[#1a1012]' : 'bg-surface2 text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 h-72 space-y-1.5 overflow-y-auto">
        {list.length === 0 && (
          <p className="rounded-2xl bg-white/[0.04] p-3 text-center text-sm text-muted">
            Nessun esercizio qui.
          </p>
        )}
        {list.map((e) => (
          <button
            key={e.id}
            onClick={() => pick(e)}
            className="flex w-full items-center gap-2 rounded-2xl bg-surface2 px-3 py-2 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{e.nome}</div>
              <div className="text-[11px] text-muted">{e.categoria} · {e.sub}</div>
            </div>
            {added.includes(e.id) && (
              <span className="text-[10px] font-medium text-teal">aggiunto</span>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/15 text-teal">
              <Icon.plus size={18} />
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
