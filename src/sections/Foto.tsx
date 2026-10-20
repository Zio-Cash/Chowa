import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui'
import { Icon } from '../components/brand'
import { dateKey, parseKey } from '../lib/date'
import { deletePhoto, listPhotos, resizeImage, savePhoto, type ProgressPhoto } from '../store/photos'

const fmt = (k: string) => {
  const d = parseKey(k)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function Foto() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<ProgressPhoto | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const reload = () => listPhotos().then(setPhotos).catch(() => setPhotos([]))
  useEffect(() => {
    reload()
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await resizeImage(file, 720)
      await savePhoto({ date: dateKey(), dataUrl })
      await reload()
    } catch {
      alert('Non è stato possibile salvare la foto.')
    }
    setBusy(false)
  }

  async function remove(date: string) {
    if (!confirm('Eliminare questa foto?')) return
    await deletePhoto(date)
    setView(null)
    reload()
  }

  return (
    <div className="space-y-4 pb-4">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <button
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[#fafafa] transition active:scale-[0.98] disabled:opacity-60"
      >
        <Icon.plus size={18} /> {busy ? 'Salvo…' : 'Aggiungi foto di oggi'}
      </button>

      <p className="px-1 text-xs text-muted">
        Le foto restano solo su questo dispositivo (non vengono sincronizzate).
      </p>

      {photos.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-muted">
            Nessuna foto ancora. Scatta la prima: tra qualche settimana vedrai la differenza.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p) => (
            <button
              key={p.date}
              onClick={() => setView(p)}
              className="relative overflow-hidden rounded-2xl active:scale-[0.98]"
            >
              <img src={p.dataUrl} alt={fmt(p.date)} className="aspect-[3/4] w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/45 py-1 text-center text-xs font-medium text-white">
                {fmt(p.date)}
              </span>
            </button>
          ))}
        </div>
      )}

      {view && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 p-4" onClick={() => setView(null)}>
          <img src={view.dataUrl} alt={fmt(view.date)} className="max-h-[78vh] w-auto rounded-2xl" />
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-white/80">{fmt(view.date)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(view.date)
              }}
              className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
            >
              <Icon.trash size={15} /> Elimina
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
