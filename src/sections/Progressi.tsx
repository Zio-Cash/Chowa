import { useState } from 'react'
import { Segmented } from '../components/ui'
import Peso from './Peso'
import Passi from './Passi'
import Foto from './Foto'

type Tab = 'peso' | 'passi' | 'foto'

export default function Progressi() {
  const [tab, setTab] = useState<Tab>('peso')
  return (
    <div className="space-y-4">
      <Segmented
        options={[
          { value: 'peso', label: 'Peso' },
          { value: 'passi', label: 'Passi' },
          { value: 'foto', label: 'Foto' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />
      {tab === 'peso' && <Peso />}
      {tab === 'passi' && <Passi />}
      {tab === 'foto' && <Foto />}
    </div>
  )
}
