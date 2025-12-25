import { useState } from 'react'
import { auth, mt5 } from '@/services/api'

export default function Home() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState<any>(null)
  const [mt5Data, setMt5Data] = useState<any>(null)
  
  // Forms
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [mt5Login, setMt5Login] = useState('')
  const [mt5Pass, setMt5Pass] = useState('')
  const [mt5Server, setMt5Server] = useState('')

  const handleLogin = async (e: any) => {
    e.preventDefault()
    try {
      const res = await auth.login({ email, password })
      localStorage.setItem('token', res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      alert('Login Success')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Login Failed')
    }
  }

  const handleRegister = async () => {
    try {
      const res = await auth.register({ email, password, fullName: 'Test User' })
      localStorage.setItem('token', res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      alert('Register Success')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Register Failed')
    }
  }

  const handleConnect = async (e: any) => {
    e.preventDefault()
    try {
      await mt5.connect({ login: mt5Login, password: mt5Pass, server: mt5Server })
      alert('MT5 Connected!')
      // Fetch summary immediately
      const res = await mt5.getSummary(mt5Login)
      setMt5Data(res.data)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Connection Failed')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl mb-4 font-bold">Login / Register</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              className="w-full border p-2 rounded" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
            <input 
              className="w-full border p-2 rounded" 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
              <button type="button" onClick={handleRegister} className="flex-1 bg-gray-600 text-white p-2 rounded hover:bg-gray-700">Register</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">OneFunders Dashboard</h1>
          <button 
            onClick={() => { localStorage.removeItem('token'); setToken(null) }}
            className="text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Connect Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Connect MT5 Account</h2>
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Login ID</label>
                <input 
                  className="w-full border p-2 rounded mt-1" 
                  value={mt5Login} 
                  onChange={e => setMt5Login(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  className="w-full border p-2 rounded mt-1" 
                  type="password"
                  value={mt5Pass} 
                  onChange={e => setMt5Pass(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Server</label>
                <input 
                  className="w-full border p-2 rounded mt-1" 
                  placeholder="e.g. MetaQuotes-Demo"
                  value={mt5Server} 
                  onChange={e => setMt5Server(e.target.value)} 
                />
              </div>
              <button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                Connect Account
              </button>
            </form>
          </div>

          {/* Summary Card */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Account Summary</h2>
            {mt5Data ? (
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-mono font-bold">{mt5Data.balance}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Equity:</span>
                  <span className="font-mono font-bold">{mt5Data.equity}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-600">Free Margin:</span>
                  <span className="font-mono font-bold">{mt5Data.marginFree}</span>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <pre className="text-xs overflow-auto">{JSON.stringify(mt5Data, null, 2)}</pre>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8">
                No account data available. Connect an account to view summary.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
