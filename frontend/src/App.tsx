import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import EnterprisesPage from './pages/Enterprises'
import DocumentsPage from './pages/Documents'
import ArchivesPage from './pages/Archives'
import TaxPage from './pages/Tax'
import BlanchimentPage from './pages/Blanchiment'
import StaffConfigPage from './pages/StaffConfig'
import CompanyConfigPage from './pages/CompanyConfig'

const API_BASE = import.meta.env.VITE_API_URL || ''

function Header() {
  const navigate = useNavigate()
  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/discord/logout`, { method: 'POST', credentials: 'include' })
    navigate('/')
  }
  return (
    <header className="border-b border-border">
      <div className="container flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="logo" className="w-8 h-8" />
          <Link to="/dashboard" className="font-semibold tracking-wide">Flashback Fa</Link>
        </div>
        <nav className="flex items-center gap-3 text-sm opacity-90">
          <Link to="/dashboard" className="hover:opacity-100">Dashboard</Link>
          <Link to="/dotations" className="hover:opacity-100">Dotations</Link>
          <Link to="/entreprises" className="hover:opacity-100">Entreprises</Link>
          <Link to="/impots" className="hover:opacity-100">Impôts</Link>
          <Link to="/documents" className="hover:opacity-100">Documents</Link>
          <Link to="/archives" className="hover:opacity-100">Archives</Link>
          <Link to="/blanchiment" className="hover:opacity-100">Blanchiment</Link>
        </nav>
        <button className="btn" onClick={logout}>Déconnexion</button>
      </div>
    </header>
  )
}

function Login() {
  const [loading, setLoading] = useState(false)
  const login = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/discord/login`, { credentials: 'include' })
      const data = await res.json()
      if (data.auth_url) window.location.href = data.auth_url
    } finally { setLoading(false) }
  }
  return (
    <div className="container min-h-[80vh] grid place-items-center">
      <div className="card w-full max-w-md text-center space-y-6">
        <img src="/logo.png" alt="logo" className="mx-auto w-24 h-24" />
        <div>
          <h1 className="text-2xl font-semibold">Connexion</h1>
          <p className="opacity-80 text-sm">Se connecter avec Discord pour accéder au portail.</p>
        </div>
        <button className="btn w-full" onClick={login} disabled={loading}>{loading? 'Redirection…' : 'Se connecter avec Discord'}</button>
      </div>
    </div>
  )
}

function useMe() {
  const [me, setMe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/discord/me`, { credentials: 'include' })
        if (res.ok) setMe(await res.json())
      } finally { setLoading(false) }
    })()
  }, [])
  return { me, loading }
}

function Dashboard() {
  const { me, loading } = useMe()
  const [summary, setSummary] = useState<any>(null)
  const [entreprise, setEntreprise] = useState('EntrepriseA')
  const guildId = '1404608015230832742'
  useEffect(() => { (async () => {
    const res = await fetch(`${API_BASE}/api/dashboard/summary/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, { credentials: 'include' })
    setSummary(await res.json())
  })() }, [entreprise])

  if (loading) return <div className="container py-6">Chargement…</div>
  if (!me) return <Login />

  return (
    <div>
      <Header />
      <main className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex gap-2 items-center">
            <span className="opacity-80">Entreprise</span>
            <select className="input" value={entreprise} onChange={e=>setEntreprise(e.target.value)}>
              <option>EntrepriseA</option>
              <option>EntrepriseB</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {k:'CA Brut',v:summary?.ca_brut},
            {k:'Dépenses',v:summary?.depenses},
            {k:'Bénéfice',v:summary?.benefice},
            {k:"Taux d'imposition",v:`${summary?.taux_imposition ?? '—'}%`},
            {k:'Montant Impôts',v:summary?.montant_impots},
            {k:'Employés',v:summary?.employee_count},
          ].map((c,i)=> (
            <div key={i} className="card">
              <div className="opacity-70 text-sm">{c.k}</div>
              <div className="text-2xl font-semibold">{c.v ?? '—'}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function DotationsPage(){
  const { me, loading } = useMe()
  const [entreprise, setEntreprise] = useState('EntrepriseA')
  const guildId = '1404608015230832742'
  if (loading) return <div className="container py-6">Chargement…</div>
  if (!me) return <Login />
  return (
    <div>
      <Header />
      <main className="container py-6">
        <Dotations entreprise={entreprise} guildId={guildId} />
      </main>
    </div>
  )
}

function Dotations({ entreprise, guildId }: { entreprise: string, guildId: string }) {
  const [rows, setRows] = useState<any[]>([])
  const [meta, setMeta] = useState<any>({ solde_actuel: 0, expenses: 0, withdrawals: 0, commissions: 0, inter_invoices: 0 })
  const [config, setConfig] = useState<any>({ salaire_pourcentage: 0.1, prime_paliers: [{ min: 1000, prime: 50 }, { min: 3000, prime: 150 }] })
  useEffect(() => { (async () => {
    const res = await fetch(`${API_BASE}/api/dotation/${guildId}?entreprise=${encodeURIComponent(entreprise)}`, { credentials: 'include' })
    const data = await res.json(); setRows(data.rows||[]); if (data.meta) setMeta(data.meta)
  })() }, [entreprise])

  const addRow = () => setRows(r => [...r, { name: '', run: 0, facture: 0, vente: 0 }])
  const save = async () => {
    const payload = { entreprise, rows: rows.map(({id, ca_total, salaire, prime, ...rest}) => rest), config, ...meta }
    const res = await fetch(`${API_BASE}/api/dotation/${guildId}`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) })
    const data = await res.json(); alert(`Sauvé. CA:${data.totals.ca_total} Salaire:${data.totals.salaire} Prime:${data.totals.prime}`)
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
                <td className="p-2"><input className="input w-full" value={row.name} onChange={e=>{const v=e.target.value; setRows(r=>r.map((x,i)=> i===idx? {...x, name:v}:x))}} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.run} onChange={e=>{const v=parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, run:v}:x))}} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.facture} onChange={e=>{const v=parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, facture:v}:x))}} /></td>
                <td className="p-2"><input className="input w-full" type="number" value={row.vente} onChange={e=>{const v=parseFloat(e.target.value||'0'); setRows(r=>r.map((x,i)=> i===idx? {...x, vente:v}:x))}} /></td>
                <td className="p-2 text-right"><button className="btn" onClick={()=>setRows(r=>r.filter((_,i)=>i!==idx))}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button className="btn" onClick={()=>setRows(r=>[...r,{name:'',run:0,facture:0,vente:0}])}>Ajouter une ligne</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-sm opacity-80">% Salaire sur CA<input className="input w-full" type="number" step="0.01" min={0} max={1} value={config.salaire_pourcentage} onChange={e=>setConfig({...config, salaire_pourcentage: parseFloat(e.target.value)})} /></label>
        <div className="text-sm opacity-80">
          Paliers prime (ex: 1000→50, 3000→150)
          <div className="mt-2 space-y-2">
            {config.prime_paliers.map((p:any, i:number)=> (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="Min CA" value={p.min} onChange={e=>{const v=parseFloat(e.target.value||'0'); setConfig((c:any)=>({...c, prime_paliers: c.prime_paliers.map((x:any,ix:number)=> ix===i? {...x, min:v}:x)}))}} />
                <input className="input" type="number" placeholder="Prime" value={p.prime} onChange={e=>{const v=parseFloat(e.target.value||'0'); setConfig((c:any)=>({...c, prime_paliers: c.prime_paliers.map((x:any,ix:number)=> ix===i? {...x, prime:v}:x)}))}} />
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
    <AppProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dotations" element={<DotationsPage />} />
        <Route path="/entreprises" element={<EnterprisesPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/archives" element={<ArchivesPage />} />
        <Route path="/impots" element={<TaxPage />} />
        <Route path="/blanchiment" element={<BlanchimentPage />} />
        <Route path="/staff-config" element={<StaffConfigPage />} />
        <Route path="/company-config" element={<CompanyConfigPage />} />
      </Routes>
    </AppProvider>
  )
}