import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * User Register
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, fullName } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE email = $1', [email])
    if (userCheck.rows.length > 0) {
      res.status(409).json({ success: false, error: 'User already exists' })
      return
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Insert user
    const newUser = await query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [email, passwordHash, fullName]
    )

    const user = newUser.rows[0]
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' })

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name }
    })
  } catch (error) {
    console.error('Register Error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    // Find user
    const result = await query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' })

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name }
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  // For JWT, logout is handled client-side by removing the token.
  // Optionally blacklist the token here if using Redis.
  res.json({ success: true, message: 'Logged out successfully' })
})

export default router
