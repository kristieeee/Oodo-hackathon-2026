import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const storageKey = 'brightloop.auth'

function getStoredAuth() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || null } catch { localStorage.removeItem(storageKey); return null }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth)
  const value = useMemo(() => ({
    token: auth?.token ?? null,
    user: auth?.user ?? null,
    login: (nextAuth) => { localStorage.setItem(storageKey, JSON.stringify(nextAuth)); setAuth(nextAuth) },
    logout: () => { localStorage.removeItem(storageKey); setAuth(null) },
  }), [auth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
