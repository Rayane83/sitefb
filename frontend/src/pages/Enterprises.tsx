import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Ent = { key:string; name:string; role_id?:string; employee_role_id?:string }

export default function EnterprisesPage(){
  const { guildId, refreshEnterprises } = useApp()
  const [rows, setRows] = useState<Ent[]>([])
  const [key, setKey] = useState('')
  const [name, setName] = useState('')

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/enterprises/${guildId}`, { credentials:'include' })
    if (res.ok) setRows(await res.json())
  }
  useEffect(()=>{ load() }, [guildId])

  const save = async () => {
    if (!key || !name) return
    const res = await fetch(`${API_BASE}/api/enterprises/${guildId}`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ key, name }) })
    if (res.ok) { setKey(''); setName(''); await load(); await refreshEnterprises() }
  }

  const extract = async () => {
    const res = await fetch(`${API_BASE}/api/enterprises/extract/${guildId}`, { credentials:'include' })
    if (res.ok){ const data = await res.json(); alert(`Détecté: ${data.detected.length} entreprises`) }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Ajouter une entreprise</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="slug (clé)" value={key} onChange={e=>setKey(e.target.value)} />
          <input className="input" placeholder="Nom" value={name} onChange={e=>setName(e.target.value)} />
          <button className="btn" onClick={save}>Ajouter</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Entreprises</h2>
          <button className="btn" onClick={extract}>Extraire depuis rôles Discord</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="opacity-80 text-left">
              <tr>
                <th className="p-2">Clé</th>
                <th className="p-2">Nom</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r)=> (
                <tr key={r.key} className="border-t border-border">
                  <td className="p-2">{r.key}</td>
                  <td className="p-2">{r.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}