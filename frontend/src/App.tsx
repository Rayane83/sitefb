import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const login = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/discord/login`, { credentials: 'include' })
      const data = await res.json()
      if (data.auth_url) {
        window.location.href = data.auth_url
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-semibold mb-2">Connexion</h1>
        <p className="text-sm opacity-80 mb-6">Connectez-vous avec Discord pour accéder au portail.</p>
        <button className="btn" onClick={login} disabled={loading}>
          {loading ? 'Redirection…' : 'Se connecter avec Discord'}
        </button>
      </div>
    </div>
  )
}

function useMe() {
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/discord/me`, { credentials: 'include' })
        if (!res.ok) throw new Error('unauth')
        const data = await res.json()
        setMe(data)
      } catch (e:any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  return { me, loading, error }
}

function Dashboard() {
  const { me, loading } = useMe()
  const [summary, setSummary] = useState<any>(null)
  const [entreprise, setEntreprise] = useState('EntrepriseA')
  const guildId = '1404608015230832742'

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/api/dashboard/summary/${guildId}?entreprise=${encodeURIComponent(entreprise)}`)
      const data = await res.json()
      setSummary(data)
    })()
  }, [entreprise])

  if (loading) return <div className="container">Chargement…</div>
  if (!me) return <div className="container">Veuillez vous connecter.</div>

  return (
    <div className="container space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2 items-center">
          <span className="opacity-80">Entreprise</span>
          <select className="input" value={entreprise} onChange={e => setEntreprise(e.target.value)}>
            <option>EntrepriseA</option>
            <option>EntrepriseB</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="opacity-70 text-sm">CA Brut</div>
          <div className="text-2xl font-semibold">{summary?.ca_brut ?? '—'}</div>
        </div>
        <div className="card">
          <div className="opacity-70 text-sm">Dépenses</div>
          <div className="text-2xl font-semibold">{summary?.depenses ?? '—'}</div>
        </div>
        <div className="card">
          <div className="opacity-70 text-sm">Bénéfice</div>
          <div className="text-2xl font-semibold">{summary?.benefice ?? '—'}</div>
        </div>
        <div className="card">
          <div className="opacity-70 text-sm">Taux d'imposition</div>
          <div className="text-2xl font-semibold">{summary?.taux_imposition ?? '—'}%</div>
        </div>
        <div className="card">
          <div className="opacity-70 text-sm">Montant Impôts</div>
          <div className="text-2xl font-semibold">{summary?.montant_impots ?? '—'}</div>
        </div>
        <div className="card">
          <div className="opacity-70 text-sm">Employés</div>
          <div className="text-2xl font-semibold">{summary?.employee_count ?? '—'}</div>
        </div>
      </div>

      <Dotations entreprise={entreprise} guildId={guildId} />
    </div>
  )
}

function Dotations({ entreprise, guildId }: { entreprise: string, guildId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [meta, setMeta] = useState<any>({ solde_actuel: 0, expenses: 0, withdrawals: 0, commissions: 0, inter_invoices: 0 })
  const [config, setConfig] = useState<any>({ salaire_pourcentage: 0.1, prime_paliers: [{ min: 1000, prime: 50 }, { min: 3000, prime: 150 }] })

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/api/dotation/${guildId}?entreprise=${encodeURIComponent(entreprise)}`)
      const data = await res.json()
      setRows(data.rows || [])
      if (data.meta) setMeta(data.meta)
    })()
  }, [entreprise])

  const addRow = () => setRows(r => [...r, { name: '', run: 0, facture: 0, vente: 0 }])

  const save = async () => {
    const payload = { entreprise, rows: rows.map(({id, ca_total, salaire, prime, ...rest}) => rest), config, ...meta }
    const res = await fetch(`${API_BASE}/api/dotation/${guildId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
    const data = await res.json()
    alert(`Sauvé. Totaux CA: ${data.totals.ca_total}, Salaire: ${data.totals.salaire}, Prime: ${data.totals.prime}`)
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dotations</h2>
        <button className="btn" onClick={save}>Enregistrer</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="text-sm opacity-80">Solde actuel<input className="input w-full" type="number" value={meta.solde_actuel} onChange={e=>setMeta({...meta, solde_actuel: parseFloat(e.target.value)})} /></label>
        <label className="text-sm opacity-80">Dépenses<input className="input w-full" type="number" value={meta.expenses} onChange={e=>setMeta({...meta, expenses: parseFloat(e.target.value)})} /></label>
        <label className="text-sm opacity-80">Retraits<input className="input w-full" type="number" value={meta.withdrawals} onChange={e=>setMeta({...meta, withdrawals: parseFloat(e.target.value)})} /></label>
        <label className="text-sm opacity-80">Commissions<input className="input w-full" type="number" value={meta.commissions} onChange={e=>setMeta({...meta, commissions: parseFloat(e.target.value)})} /></label>
        <label className="text-sm opacity-80">Inter-factures<input className="input w-full" type="number" value={meta.inter_invoices} onChange={e=>setMeta({...meta, inter_invoices: parseFloat(e.target.value)})} /></label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="opacity-80 text-left">
            <tr>
              <th className="p-2">Nom</th>
              <th className="p-2">Run</th>
              <th className="p-2">Facture</th>
              <th className="p-2">Vente</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="p-2"><input className="input w-full" value={row.name} onChange={e=>{
                  const v = e.target.value; setRows(r=>r.map((x,i)=> i===idx? {...x, name:v}:x))
                }} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.run} onChange={e=>{
                  const v = parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, run:v}:x))
                }} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.facture} onChange={e=>{
                  const v = parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, facture:v}:x))
                }} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.vente} onChange={e=>{
                  const v = parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, vente:v}:x))
                }} /></td>
                <td className="p-2 text-right"><button className="btn" onClick={()=>setRows(r=>r.filter((_,i)=>i!==idx))}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button className="btn" onClick={addRow}>Ajouter une ligne</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm opacity-80">% Salaire sur CA<input className="input w-full" type="number" step="0.01" min={0} max={1} value={config.salaire_pourcentage} onChange={e=>setConfig({...config, salaire_pourcentage: parseFloat(e.target.value)})} /></label>
        <div className="text-sm opacity-80">
          Paliers prime (ex: 1000→50, 3000→150)
          <div className="mt-2 space-y-2">
            {config.prime_paliers.map((p:any, i:number)=> (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="Min CA" value={p.min} onChange={e=>{
                  const v = parseFloat(e.target.value||'0');
                  setConfig((c:any)=> ({...c, prime_paliers: c.prime_paliers.map((x:any,ix:number)=> ix===i? {...x, min:v}:x)}))
                }} />
                <input className="input" type="number" placeholder="Prime" value={p.prime} onChange={e=>{
                  const v = parseFloat(e.target.value||'0');
                  setConfig((c:any)=> ({...c, prime_paliers: c.prime_paliers.map((x:any,ix:number)=> ix===i? {...x, prime:v}:x)}))
                }} />
              </div>
            ))}
            <button className="btn" onClick={()=> setConfig((c:any)=> ({...c, prime_paliers: [...c.prime_paliers, {min:0, prime:0}] }))}>Ajouter palier</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}