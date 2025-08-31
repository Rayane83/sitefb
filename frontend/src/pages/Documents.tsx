import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Doc = { id:number; filename:string; content_type:string; size:number; uploaded_by?:string; document_type?:string }

export default function DocumentsPage(){
  const { guildId, entreprise } = useApp()
  const [docs, setDocs] = useState<Doc[]>([])
  const [file, setFile] = useState<File|undefined>()
  const [doctype, setDoctype] = useState('facture')
  const [filter, setFilter] = useState('')

  const load = async ()=>{
    const res = await fetch(`${API_BASE}/api/documents/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, { credentials:'include' })
    if (res.ok) setDocs(await res.json())
  }
  useEffect(()=>{ load() }, [guildId, entreprise])

  const upload = async ()=>{
    if (!file) return
    const fd = new FormData()
    fd.append('entreprise', entreprise)
    fd.append('document_type', doctype)
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/api/documents/upload/${guildId}`, { method:'POST', body: fd, credentials:'include' })
    if (res.ok) { setFile(undefined); await load() }
  }

  const preview = async (d: Doc) => {
    const res = await fetch(`${API_BASE}/api/documents/${guildId}/${d.id}/download`, { credentials:'include' })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const w = window.open('about:blank', '_blank')
    if (w) w.location.href = url
  }

  const filtered = docs.filter(d => d.filename.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Uploader un document</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="file" className="input" onChange={e=>setFile(e.target.files?.[0])} />
          <select className="input" value={doctype} onChange={e=>setDoctype(e.target.value)}>
            <option value="facture">Facture</option>
            <option value="diplome">Diplôme</option>
            <option value="autre">Autre</option>
          </select>
          <button className="btn" onClick={upload}>Uploader</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Documents</h2>
          <input className="input" placeholder="Rechercher…" value={filter} onChange={e=>setFilter(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="opacity-80 text-left">
              <tr>
                <th className="p-2">Fichier</th>
                <th className="p-2">Type</th>
                <th className="p-2">Taille</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-2">{d.filename}</td>
                  <td className="p-2">{d.content_type}</td>
                  <td className="p-2">{(d.size/1024).toFixed(1)} Ko</td>
                  <td className="p-2"><button className="btn" onClick={()=>preview(d)}>Prévisualiser / Télécharger</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}