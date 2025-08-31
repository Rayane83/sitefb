import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function BlanchimentPage(){
  const { guildId } = useApp()
  const [state, setState] = useState({ enabled:false, use_global:true, perc_entreprise:0, perc_groupe:0 })
  const [globalCfg, setGlobalCfg] = useState({ perc_entreprise:0, perc_groupe:0 })

  const load = async ()=>{
    const s = await fetch(`${API_BASE}/api/blanchiment/state/global`, { credentials:'include' }).then(r=>r.json())
    const g = await fetch(`${API_BASE}/api/blanchiment/global/${guildId}`, { credentials:'include' }).then(r=>r.json())
    setState(s); setGlobalCfg(g)
  }
  useEffect(()=>{ load() }, [guildId])

  const saveState = async ()=>{
    await fetch(`${API_BASE}/api/blanchiment/state/global`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(state) })
    alert('État enregistré')
  }
  const saveGlobal = async ()=>{
    await fetch(`${API_BASE}/api/blanchiment/global/${guildId}`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(globalCfg) })
    alert('Global enregistré')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">État (scope global)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label className="text-sm opacity-80">Activé
            <select className="input" value={String(state.enabled)} onChange={e=>setState(s=>({...s, enabled: e.target.value==='true'}))}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </label>
          <label className="text-sm opacity-80">Utiliser global
            <select className="input" value={String(state.use_global)} onChange={e=>setState(s=>({...s, use_global: e.target.value==='true'}))}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </label>
          <label className="text-sm opacity-80">% Entreprise<input className="input" type="number" value={state.perc_entreprise} onChange={e=>setState(s=>({...s, perc_entreprise: parseFloat(e.target.value||'0')}))} /></label>
          <label className="text-sm opacity-80">% Groupe<input className="input" type="number" value={state.perc_groupe} onChange={e=>setState(s=>({...s, perc_groupe: parseFloat(e.target.value||'0')}))} /></label>
        </div>
        <div className="mt-3"><button className="btn" onClick={saveState}>Enregistrer</button></div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Global par guild</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <label className="text-sm opacity-80">% Entreprise<input className="input" type="number" value={globalCfg.perc_entreprise} onChange={e=>setGlobalCfg(s=>({...s, perc_entreprise: parseFloat(e.target.value||'0')}))} /></label>
          <label className="text-sm opacity-80">% Groupe<input className="input" type="number" value={globalCfg.perc_groupe} onChange={e=>setGlobalCfg(s=>({...s, perc_groupe: parseFloat(e.target.value||'0')}))} /></label>
        </div>
        <div className="mt-3"><button className="btn" onClick={saveGlobal}>Enregistrer</button></div>
      </div>
    </div>
  )
}