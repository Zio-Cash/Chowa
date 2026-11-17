import { useState } from 'react'
import type { ExExercise, ExKind } from '../types'
import { Button, Field, NumberInput, Segmented, Sheet, Stepper } from './ui'

/** Editor dei parametri di un esercizio della scheda (serie, carico, tempi…). */
export default function ExerciseEditor({
  ex,
  title = 'Edit exercise',
  onSave,
  onClose,
}: {
  ex: ExExercise
  title?: string
  onSave: (ex: ExExercise) => void
  onClose: () => void
}) {
  const [d, setD] = useState<ExExercise>(ex)
  return (
    <Sheet open onClose={onClose} title={title}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={d.nome}
            onChange={(e) => setD({ ...d, nome: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Field label="Type">
          <Segmented<ExKind>
            options={[
              { value: 'reps', label: 'Reps' },
              { value: 'tempo', label: 'Timed' },
            ]}
            value={d.tipo}
            onChange={(v) => setD({ ...d, tipo: v })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sets">
            <Stepper value={d.serie} onChange={(serie) => setD({ ...d, serie })} min={1} />
          </Field>
          {d.tipo === 'reps' ? (
            <Field label="Reps">
              <Stepper value={d.reps ?? 0} onChange={(reps) => setD({ ...d, reps })} min={1} />
            </Field>
          ) : (
            <Field label="Duration (s)">
              <Stepper value={d.durataSec ?? 0} onChange={(durataSec) => setD({ ...d, durataSec })} step={10} min={0} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Load (kg)">
            <NumberInput value={d.carico ?? ''} onChange={(carico) => setD({ ...d, carico })} suffix="kg" />
          </Field>
          <Field label="Rest (s)">
            <Stepper value={d.riposoSec} onChange={(riposoSec) => setD({ ...d, riposoSec })} step={5} min={0} />
          </Field>
        </div>
        <Field label="Notes">
          <input
            value={d.note ?? ''}
            onChange={(e) => setD({ ...d, note: e.target.value })}
            placeholder="e.g. per leg, bodyweight…"
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Button className="w-full" onClick={() => onSave(d)}>
          Save
        </Button>
      </div>
    </Sheet>
  )
}
