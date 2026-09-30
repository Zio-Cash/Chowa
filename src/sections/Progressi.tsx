import { useState } from 'react'
import { Segmented } from '../components/ui'
import Peso from './Peso'
import Passi from './Passi'

export default function Progressi() {
  const [tab, setTab] = useState<'peso' | 'passi'>('peso')
  return (
    <div className="space-y-4">
      <Segmented
        options={[
          { value: 'peso', label: 'Peso' },
          { value: 'passi', label: 'Passi' },
        ]}
        value={tab}
        onChange={(v) => setTab(v as 'peso' | 'passi')}
      />
      {tab === 'peso' ? <Peso /> : <Passi />}
    </div>
  )
}
