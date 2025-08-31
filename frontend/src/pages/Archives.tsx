import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { toCSV, download } from '@/utils/export'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Entry = { id:number; date:string; type:string; employe?:string; entreprise?:string; montant:number; statut:string }

export default function ArchivesPage(){
  const { guildId, entreprise } = useApp()
  const [rows, setRows] = useState<Entry[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const load = async () => {
    const res = await fetch(`${API_BASE}/api/archive/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, { credentials:'include' })
    if (res.ok) setRows(await res.json())
  }
  useEffect(() => { load() }, [guildId, entreprise])

  const filtered = useMemo(()=> rows.filter(r => (
    (!q || (r.type?.toLowerCase().includes(q.toLowerCase()) || r.employe?.toLowerCase().includes(q.toLowerCase()))) &&
    (!status || r.statut === status)
  )), [rows, q, status])

  const exportCSV = () => {
    download(`archives_${entreprise}.csv`, toCSV(filtered), 'text/csv')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="text-sm opacity-80">Recherche<input className="input w-full" value={q} onChange={e=>setQ(e.target.value)} /></label>
          <label className="text-sm opacity-80">Statut
            <select className="input w-full" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="">Tous</option>
              <option>En attente</option>
              <option>Validé</option>
              <option>Payé</option>
            </select>
          </label>
          <div />
          <button className="btn" onClick={exportCSV}>Exporter CSV</button>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Archives</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="opacity-80 text-left">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Employé</th>
                <th className="p-2">Entreprise</th>
                <th className="p-2">Montant</th>
                <th className="p-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.employe}</td>
                  <td className="p-2">{r.entreprise}</td>
                  <td className="p-2">{r.montant}</td>
                  <td className="p-2">{r.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}