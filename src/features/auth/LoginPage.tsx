'use client'
import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth } from '@/shared/firebase'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/office')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/office')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <main className="flex h-screen items-center justify-center bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 w-72 bg-gray-900 p-8 rounded-xl shadow-xl"
      >
        <h1 className="text-white text-2xl font-bold">Oficinita</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="bg-gray-800 text-white px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-md text-sm font-medium transition-colors"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
