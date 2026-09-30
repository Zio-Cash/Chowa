import { useState } from 'react'
import type { ExExercise, ExKind } from '../types'
import { Button, Field, NumberInput, Segmented, Sheet, Stepper } from './ui'

/** Editor dei parametri di un esercizio della scheda (serie, carico, tempi…). */
export default function ExerciseEditor({
  ex,
  title = 'Modifica esercizio',
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
        <Field label="Nome">
          <input
            value={d.nome}
            onChange={(e) => setD({ ...d, nome: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Field label="Tipo">
          <Segmented<ExKind>
            options={[
              { value: 'reps', label: 'Ripetizioni' },
              { value: 'tempo', label: 'A tempo' },
            ]}
            value={d.tipo}
            onChange={(v) => setD({ ...d, tipo: v })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Serie">
            <Stepper value={d.serie} onChange={(serie) => setD({ ...d, serie })} min={1} />
          </Field>
          {d.tipo === 'reps' ? (
            <Field label="Ripetizioni">
              <Stepper value={d.reps ?? 0} onChange={(reps) => setD({ ...d, reps })} min={1} />
            </Field>
          ) : (
            <Field label="Durata (s)">
              <Stepper value={d.durataSec ?? 0} onChange={(durataSec) => setD({ ...d, durataSec })} step={10} min={0} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Carico kg">
            <NumberInput value={d.carico ?? ''} onChange={(carico) => setD({ ...d, carico })} suffix="kg" />
          </Field>
          <Field label="Riposo (s)">
            <Stepper value={d.riposoSec} onChange={(riposoSec) => setD({ ...d, riposoSec })} step={5} min={0} />
          </Field>
        </div>
        <Field label="Note">
          <input
            value={d.note ?? ''}
            onChange={(e) => setD({ ...d, note: e.target.value })}
            placeholder="es. per gamba, corpo libero…"
            className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-white/[0.05] focus:ring-teal/30"
          />
        </Field>
        <Button className="w-full" onClick={() => onSave(d)}>
          Salva
        </Button>
      </div>
    </Sheet>
  )
}
