import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Company = {
  identification: any
  salaire: { pourcentage_ca:number; modes:string[]; prime_base:number }
  parametres: any
  grade_rules: any[]
}

export default function CompanyConfigPage(){
  const { guildId, enterprises } = useApp()
  const [entrepriseId, setEntrepriseId] = useState<number>(0)
  const [cfg, setCfg] = useState<Company>({ identification:{}, salaire:{ pourcentage_ca:0.1, modes:['ca_employe'], prime_base:0 }, parametres:{}, grade_rules:[] })

  useEffect(()=>{ if (enterprises.length && !entrepriseId) setEntrepriseId(1) }, [enterprises])

  const load = async ()=>{
    if (!entrepriseId) return
    const res = await fetch(`${API_BASE}/api/company/config/${guildId}?entreprise_id=${entrepriseId}`, { credentials:'include' })
    if (res.ok) setCfg(await res.json())
  }
  useEffect(()=>{ load() }, [guildId, entrepriseId])

  const save = async ()=>{
    await fetch(`${API_BASE}/api/company/config/${guildId}?entreprise_id=${entrepriseId}`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(cfg) })
    alert('Configuration entreprise enregistrée')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Configuration Entreprise</h2>
          <div className="flex gap-2 items-center">
            <span className="opacity-80 text-sm">Entreprise</span>
            <select className="input" value={entrepriseId} onChange={e=>setEntrepriseId(parseInt(e.target.value))}>
              <option value={0}>Sélectionner</option>
              {enterprises.map((e, idx)=> (
                <option key={e.key} value={idx+1}>{e.name}</option>
              ))}
            </select>
            <button className="btn" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Salaire</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="text-sm opacity-80">% CA<input className="input" type="number" step="0.01" min={0} max={1} value={cfg.salaire.pourcentage_ca} onChange={e=>setCfg(c=> ({...c, salaire:{...c.salaire, pourcentage_ca: parseFloat(e.target.value)}}))} /></label>
          <label className="text-sm opacity-80">Prime base<input className="input" type="number" value={cfg.salaire.prime_base} onChange={e=>setCfg(c=> ({...c, salaire:{...c.salaire, prime_base: parseFloat(e.target.value)}}))} /></label>
          <label className="text-sm opacity-80">Modes (comma)
            <input className="input" value={cfg.salaire.modes.join(',')} onChange={e=>setCfg(c=> ({...c, salaire:{...c.salaire, modes: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}}))} />
          </label>
        </div>
      </div>
    </div>
  )
}