import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Bracket = { min:number; max?:number; rate:number }

autoFill: any
export default function TaxPage(){
  const { guildId, entreprise } = useApp()
  const [brackets, setBrackets] = useState<Bracket[]>([])
  const [wealth, setWealth] = useState<{threshold:number; rate:number} | null>(null)

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/tax/brackets/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, { credentials:'include' })
    if (res.ok){ const data = await res.json(); setBrackets(data.brackets || []); setWealth(data.wealth) }
  }
  useEffect(()=>{ load() }, [guildId, entreprise])

  const add = () => setBrackets(b=>[...b,{min:0,rate:0}])
  const save = async () => {
    const res = await fetch(`${API_BASE}/api/tax/brackets/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, {
      method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ brackets, wealth })
    })
    if (res.ok) alert('Tranches fiscales enregistrées.')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tranches fiscales</h2>
          <div className="flex gap-2">
            <button className="btn" onClick={add}>Ajouter tranche</button>
            <button className="btn" onClick={save}>Enregistrer</button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {brackets.map((b, i)=> (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input className="input" type="number" placeholder="Min" value={b.min} onChange={e=>{
                const v = parseFloat(e.target.value||'0'); setBrackets(arr=> arr.map((x,ix)=> ix===i? {...x, min:v}:x))
              }} />
              <input className="input" type="number" placeholder="Max (optionnel)" value={b.max ?? ''} onChange={e=>{
                const v = e.target.value? parseFloat(e.target.value): undefined; setBrackets(arr=> arr.map((x,ix)=> ix===i? {...x, max:v}:x))
              }} />
              <input className="input" type="number" step="0.01" min={0} max={1} placeholder="Taux" value={b.rate} onChange={e=>{
                const v = parseFloat(e.target.value||'0'); setBrackets(arr=> arr.map((x,ix)=> ix===i? {...x, rate:v}:x))
              }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Wealth tax</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder="Seuil" value={wealth?.threshold ?? ''} onChange={e=>{
            const v = e.target.value? parseFloat(e.target.value): undefined
            setWealth(w=> ({ threshold: v || 0, rate: w?.rate ?? 0 }))
          }} />
          <input className="input" type="number" step="0.01" min={0} max={1} placeholder="Taux" value={wealth?.rate ?? ''} onChange={e=>{
            const v = e.target.value? parseFloat(e.target.value): undefined
            setWealth(w=> ({ threshold: w?.threshold ?? 0, rate: v || 0 }))
          }} />
        </div>
      </div>
    </div>
  )
}