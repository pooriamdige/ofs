import { Router, type Request, type Response } from 'express'
import { MT5Service } from '../services/mt5.service.js'
import { query } from '../db/index.js'
import { encrypt } from '../utils/crypto.js'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Middleware to verify token
const authenticateToken = (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) return res.sendStatus(401)

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

/**
 * Connect MT5 Account
 * POST /api/mt5/connect
 */
router.post('/connect', authenticateToken, async (req: any, res: Response): Promise<void> => {
  try {
    const { login, password, server, broker } = req.body
    const userId = req.user.id

    // 1. Validate inputs
    if (!login || !password || !server) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    // 2. Test Connection with MT5 Service
    // Note: MT5Service.connect might throw if connection fails
    await MT5Service.connect(login, password, server)

    // 3. Encrypt Password
    const encryptedPass = encrypt(password)

    // 4. Save to Database
    await query(
      `INSERT INTO mt5_accounts 
       (user_id, login_id, server, broker, password_encrypted, connection_status, last_sync)
       VALUES ($1, $2, $3, $4, $5, 'connected', NOW())
       ON CONFLICT (user_id, login_id, server) 
       DO UPDATE SET 
         password_encrypted = EXCLUDED.password_encrypted,
         connection_status = 'connected',
         last_sync = NOW()`,
      [userId, login, server, broker || 'Unknown', encryptedPass]
    )

    res.json({ success: true, message: 'MT5 Account Connected Successfully' })
  } catch (error: any) {
    console.error('MT5 Connect Error:', error.message)
    res.status(500).json({ success: false, error: error.message || 'Failed to connect MT5 account' })
  }
})

/**
 * Get Account Summary
 * GET /api/mt5/:loginId/summary
 */
router.get('/:loginId/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { loginId } = req.params
    // In a real app, verify that this loginId belongs to req.user.id
    
    const data = await MT5Service.getAccountSummary(loginId)
    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch summary' })
  }
})

export default router
