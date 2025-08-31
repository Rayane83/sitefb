import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Palier = { min:number; bonus:number }

export default function StaffConfigPage(){
  const { guildId } = useApp()
  const [paliers, setPaliers] = useState<Palier[]>([])

  const load = async ()=>{
    const res = await fetch(`${API_BASE}/api/staff/config/${guildId}`, { credentials:'include' })
    if (res.ok){ const data = await res.json(); setPaliers(data.paliers || []) }
  }
  useEffect(()=>{ load() }, [guildId])

  const add = ()=> setPaliers(p=>[...p,{min:0,bonus:0}])
  const save = async ()=>{
    await fetch(`${API_BASE}/api/staff/config/${guildId}`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ paliers }) })
    alert('Paliers sauvés')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Paliers salariaux (Staff global)</h2>
          <div className="flex gap-2">
            <button className="btn" onClick={add}>Ajouter palier</button>
            <button className="btn" onClick={save}>Enregistrer</button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {paliers.map((p,i)=> (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input className="input" type="number" placeholder="Min CA" value={p.min} onChange={e=>{
                const v=parseFloat(e.target.value||'0'); setPaliers(arr=> arr.map((x,ix)=> ix===i? {...x, min:v}:x))
              }} />
              <input className="input" type="number" placeholder="Bonus" value={p.bonus} onChange={e=>{
                const v=parseFloat(e.target.value||'0'); setPaliers(arr=> arr.map((x,ix)=> ix===i? {...x, bonus:v}:x))
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}