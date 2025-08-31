import React, { createContext, useContext, useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

type Ctx = {
  guildId: string
  entreprise: string
  setEntreprise: (v: string) => void
  enterprises: { key: string; name: string }[]
  refreshEnterprises: () => Promise<void>
}

const AppContext = createContext<Ctx | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guildId] = useState('1404608015230832742')
  const [entreprise, setEntreprise] = useState('EntrepriseA')
  const [enterprises, setEnterprises] = useState<{ key: string; name: string }[]>([])

  const refreshEnterprises = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/enterprises/${guildId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setEnterprises(data.map((e: any) => ({ key: e.key, name: e.name })))
        if (data.length && !data.find((e: any) => e.name === entreprise)) {
          setEntreprise(data[0].name)
        }
      }
    } catch {}
  }

  useEffect(() => { refreshEnterprises() }, [])

  return (
    <AppContext.Provider value={{ guildId, entreprise, setEntreprise, enterprises, refreshEnterprises }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}