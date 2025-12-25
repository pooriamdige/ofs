import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import { validateHmac } from '../middleware/hmac.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * Exchange WP User ID for JWT (S2S)
 * POST /api/auth/exchange
 * Headers: X-OneFunders-Signature, etc.
 */
router.post('/exchange', validateHmac, async (req: Request, res: Response): Promise<void> => {
  try {
    const { wp_user_id, email, fullName } = req.body;

    if (!wp_user_id) {
      res.status(400).json({ success: false, error: 'wp_user_id is required' });
      return;
    }

    // Upsert user based on wp_user_id or email
    // We assume wp_user_id is the source of truth for linking
    let userResult = await query('SELECT * FROM users WHERE wp_user_id = $1', [wp_user_id]);
    
    if (userResult.rows.length === 0) {
      // If not found by ID, check by email (migration path)
      if (email) {
         userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
         if (userResult.rows.length > 0) {
            // Link existing user
            await query('UPDATE users SET wp_user_id = $1 WHERE id = $2', [wp_user_id, userResult.rows[0].id]);
         } else {
            // Create new user
            const rawPass = Math.random().toString(36);
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(rawPass, salt);
            
            userResult = await query(
              'INSERT INTO users (email, password_hash, full_name, wp_user_id) VALUES ($1, $2, $3, $4) RETURNING *',
              [email || `user${wp_user_id}@placeholder.com`, hash, fullName || 'Trader', wp_user_id]
            );
         }
      } else {
         res.status(400).json({ success: false, error: 'User not found and no email provided for creation' });
         return;
      }
    }

    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, wp_user_id: user.wp_user_id }, 
      JWT_SECRET, 
      { expiresIn: '15m' } // Short-lived token as per architecture
    );

    res.json({
      success: true,
      token,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      user: { id: user.id, email: user.email, fullName: user.full_name }
    });

  } catch (error) {
    console.error('Auth Exchange Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * User Register (Direct)
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
 * User Login (Direct)
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

export default router
