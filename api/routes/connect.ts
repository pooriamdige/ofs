import { Router, type Request, type Response } from 'express'
import { validateHmac } from '../middleware/hmac.js'
import { MT5Service } from '../services/mt5.service.js'
import { query } from '../db/index.js'
import { encrypt } from '../utils/crypto.js'

const router = Router()

/**
 * S2S Connect MT5 Account
 * POST /api/connect
 */
router.post('/', validateHmac, async (req: Request, res: Response): Promise<void> => {
  try {
    const { login, investor_pass, server, account_type, wp_user_id } = req.body

    if (!login || !investor_pass || !server || !wp_user_id) {
      res.status(400).json({ success: false, error: 'Missing required fields' })
      return
    }

    // 1. Find or Create User
    let userResult = await query('SELECT id FROM users WHERE wp_user_id = $1', [wp_user_id])
    if (userResult.rows.length === 0) {
        // Create placeholder user if not exists (should be handled by auth/exchange usually, but good fallback)
        res.status(404).json({ success: false, error: 'User not found. Please sync user first.' })
        return
    }
    const userId = userResult.rows[0].id

    // 2. Test Connection
    await MT5Service.connect(login, investor_pass, server)

    // 3. Encrypt Password
    const encryptedPass = encrypt(investor_pass)

    // 4. Save Account
    // We use `accounts` and `account_instances` tables as per architecture
    // First, ensure `accounts` record
    const accountRes = await query(
        `INSERT INTO accounts (wp_user_id, login, server, account_type)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (login, server) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [wp_user_id, login, server, account_type || 'standard']
    )
    const accountId = accountRes.rows[0].id

    // Then create/update instance
    // Hash ID could be simple UUID or hash of login+server
    const hashId = Buffer.from(`${login}-${server}`).toString('base64')
    
    await query(
        `INSERT INTO account_instances (account_id, hash_id, encrypted_investor_pass, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (account_id, hash_id) DO UPDATE SET 
         encrypted_investor_pass = $3, status = 'active'`,
        [accountId, hashId, encryptedPass]
    )

    res.json({
        success: true,
        account_id: accountId,
        message: 'Account connected successfully'
    })

  } catch (error: any) {
    console.error('S2S Connect Error:', error.message)
    res.status(500).json({ success: false, error: error.message || 'Failed to connect' })
  }
})

export default router
