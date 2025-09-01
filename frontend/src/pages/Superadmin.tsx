import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const API_BASE = import.meta.env.VITE_API_URL || ''

type DiscordCfg = { client_id: string; principal_guild_id: string; config: any }

type Role = { id:string; name:string; color?:number; position?:number }

export default function SuperadminPage(){
  const [cfg, setCfg] = useState<DiscordCfg>({ client_id: '', principal_guild_id: '', config: {} })
  const [roles, setRoles] = useState<Role[]>([])
  const [error, setError] = useState<string>('')

  const load = async ()=>{
    try {
      const res = await fetch(`${API_BASE}/api/admin/discord-config`, { credentials:'include' })
      if (res.status === 403){ setError('Accès superadmin requis'); return }
      if (!res.ok){ setError('Erreur chargement config'); return }
      const data = await res.json(); setCfg(data)
    } catch { setError('Erreur réseau') }
  }

  useEffect(()=>{ load() }, [])

  const save = async ()=>{
    try {
      const res = await fetch(`${API_BASE}/api/admin/discord-config`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(cfg) })
      if (!res.ok) throw new Error('save error')
      toast.success('Configuration enregistrée')
    } catch { toast.error('Échec enregistrement') }
  }

  const fetchRoles = async ()=>{
    if (!cfg.principal_guild_id){ toast.error('Saisir principal_guild_id'); return }
    try {
      const res = await fetch(`${API_BASE}/api/admin/guild-roles/${cfg.principal_guild_id}`, { credentials:'include' })
      if (!res.ok) throw new Error('fetch roles error')
      setRoles(await res.json())
    } catch { toast.error('Impossible de récupérer les rôles') }
  }

  if (error) return (
    <div className="container py-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold mb-2">Superadmin</h1>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="container py-6 space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h1 className="text-2xl font-semibold mb-4">Superadmin - Configuration Discord</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm opacity-80">Client ID<Input value={cfg.client_id} onChange={e=>setCfg(c=>({...c, client_id: e.target.value}))} /></label>
          <label className="text-sm opacity-80">Principal Guild ID<Input value={cfg.principal_guild_id} onChange={e=>setCfg(c=>({...c, principal_guild_id: e.target.value}))} /></label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save}>Enregistrer</Button>
          <Button variant="outline" onClick={fetchRoles}>Charger rôles du guild</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-soft">
        <h2 className="text-xl font-semibold mb-3">Rôles du Guild</h2>
        {roles.length === 0 ? (
          <p className="text-sm opacity-80">Aucun rôle chargé. Cliquez sur "Charger rôles du guild".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="opacity-80 text-left">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Nom</th>
                  <th className="p-2">Position</th>
                </tr>
              </thead>
              <tbody>
                {roles.sort((a,b)=> (b.position||0)-(a.position||0)).map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}