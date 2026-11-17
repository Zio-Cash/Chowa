import { useEffect, useRef, useState } from 'react'
import { Button, Card, Field, Sheet } from '../components/ui'
import { Icon } from '../components/brand'
import { dateKey, parseKey } from '../lib/date'
import { deletePhoto, listPhotos, resizeImage, savePhoto, type ProgressPhoto } from '../store/photos'

const fmt = (k: string) => {
  const d = parseKey(k)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function Foto() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<ProgressPhoto | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const libInput = useRef<HTMLInputElement>(null)
  // foto scelta dalla libreria: prima di salvarla si sceglie la data
  const [picked, setPicked] = useState<{ dataUrl: string; date: string } | null>(null)

  const reload = () =>
    listPhotos()
      .then(setPhotos)
      .catch(() => setPhotos([]))
  useEffect(() => {
    reload()
  }, [])

  async function store(date: string, dataUrl: string): Promise<boolean> {
    // una foto per giorno: la seconda sostituirebbe la prima senza dirlo
    if (
      photos.some((p) => p.date === date) &&
      !confirm(`You already have a photo for ${fmt(date)}. Replace it?`)
    )
      return false
    await savePhoto({ date, dataUrl })
    await reload()
    return true
  }

  // Scattata adesso → data di oggi
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      await store(dateKey(), await resizeImage(file, 720))
    } catch {
      alert('Couldn’t save the photo.')
    }
    setBusy(false)
  }

  // Dalla libreria → si propone la data del file (se passata), modificabile
  async function onLibraryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await resizeImage(file, 720)
      const fileDay = file.lastModified ? dateKey(new Date(file.lastModified)) : dateKey()
      setPicked({ dataUrl, date: fileDay < dateKey() ? fileDay : dateKey() })
    } catch {
      alert('Couldn’t load the photo.')
    }
    setBusy(false)
  }

  async function savePicked() {
    if (!picked) return
    setBusy(true)
    try {
      if (await store(picked.date, picked.dataUrl)) setPicked(null)
    } catch {
      alert('Couldn’t save the photo.')
    }
    setBusy(false)
  }

  async function remove(date: string) {
    if (!confirm('Delete this photo?')) return
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
      <input ref={libInput} type="file" accept="image/*" onChange={onLibraryFile} className="hidden" />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => input.current?.click()} disabled={busy}>
          <Icon.camera size={17} /> {busy ? 'Saving…' : 'Take photo'}
        </Button>
        <Button variant="soft" onClick={() => libInput.current?.click()} disabled={busy}>
          <Icon.image size={17} /> From library
        </Button>
      </div>

      <p className="px-1 text-xs text-muted">Photos stay on this device only (they aren’t synced).</p>

      {photos.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-muted">
            No photos yet. Take one or pick it from your library: in a few weeks you’ll see the difference.
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
              <img
                src={p.dataUrl}
                alt={fmt(p.date)}
                decoding="async"
                className="aspect-[3/4] w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/45 py-1 text-center text-xs font-medium text-white">
                {fmt(p.date)}
              </span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <Sheet open onClose={() => setPicked(null)} title="Add photo">
          <img src={picked.dataUrl} alt="" className="mx-auto max-h-[46dvh] w-auto rounded-2xl" />
          <div className="mt-4">
            <Field label="Date of the photo">
              <input
                type="date"
                value={picked.date}
                max={dateKey()}
                onChange={(e) => e.target.value && setPicked({ ...picked, date: e.target.value })}
                className="min-h-[46px] w-full rounded-2xl bg-surface2 px-4 outline-none ring-1 ring-black/[0.05] focus:ring-teal/30"
              />
            </Field>
          </div>
          <Button className="mt-4 w-full" onClick={savePicked} disabled={busy}>
            <Icon.check size={16} /> {busy ? 'Saving…' : 'Save photo'}
          </Button>
        </Sheet>
      )}

      {view && (
        <div
          className="backdrop-in fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 p-4"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          }}
          onClick={() => setView(null)}
        >
          <img
            src={view.dataUrl}
            alt={fmt(view.date)}
            decoding="async"
            className="max-h-[78dvh] w-auto rounded-2xl"
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm text-white/80">{fmt(view.date)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(view.date)
              }}
              className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white"
            >
              <Icon.trash size={15} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
