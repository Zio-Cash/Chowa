import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseReady, googleProvider } from '../lib/firebase'

const VIEW_KEY = 'fitvita:viewing'

interface AuthCtx {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  authError: string | null
  /** uid del proprietario di cui sto guardando i dati (sola lettura), oppure null. */
  viewingUid: string | null
  setViewingUid: (uid: string | null) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseReady)
  const [authError, setAuthError] = useState<string | null>(null)
  const [viewingUid, setViewingUidState] = useState<string | null>(
    () => localStorage.getItem(VIEW_KEY) || null,
  )

  useEffect(() => {
    if (!firebaseReady) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const setViewingUid = useCallback((uid: string | null) => {
    setViewingUidState(uid)
    if (uid) localStorage.setItem(VIEW_KEY, uid)
    else localStorage.removeItem(VIEW_KEY)
  }, [])

  const signIn = useCallback(async () => {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Accesso non riuscito.')
    }
  }, [])

  const signOut = useCallback(async () => {
    setViewingUid(null)
    await fbSignOut(auth)
  }, [setViewingUid])

  const value = useMemo<AuthCtx>(
    () => ({ user, loading, signIn, signOut, authError, viewingUid, setViewingUid }),
    [user, loading, signIn, signOut, authError, viewingUid, setViewingUid],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth deve essere usato dentro AuthProvider')
  return v
}
