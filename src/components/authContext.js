import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { user, loading, sessionExpired, startSession, signOut, refreshUser } del AuthProvider.
export function useAuth() {
  return useContext(AuthContext)
}
