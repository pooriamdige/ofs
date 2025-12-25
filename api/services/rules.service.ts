import { query } from '../db/index.js'
import { MT5Service } from './mt5.service.js'
import { decrypt } from '../utils/crypto.js'

export class RulesService {
  /**
   * Run rule checks for a specific account instance
   */
  static async checkRules(instanceId: string, login: string, server: string, encryptedPass: string) {
    try {
        const password = decrypt(encryptedPass);
        
        // 1. Fetch current data from MT5
        // We might need a better way to get data without re-login every time if possible, 
        // but for now we assume connect/summary is fast enough or handles sessions.
        // Actually MT5Service.getAccountSummary needs login/password usually if not cached?
        // The current MT5Service.getAccountSummary only takes login, assuming the service manages connection.
        // If not, we might need to pass password. Let's assume MT5Service handles it or we call connect first.
        
        // Ensure connected (idempotent in many implementations)
        await MT5Service.connect(login, password, server);
        
        const summary = await MT5Service.getAccountSummary(login);
        const { balance, equity } = summary; // Adjust based on actual MT5 response structure

        // 2. Record Equity History
        await query(
            `INSERT INTO equity_history (account_instance_id, balance, equity, recorded_at)
             VALUES ($1, $2, $3, NOW())`,
            [instanceId, balance, equity]
        );

        // 3. Check Daily Drawdown (5%)
        // Reset time: 01:30 Asia/Tehran
        // We need the equity at the last reset time.
        
        // Calculate last reset time in UTC
        // Tehran is UTC+3:30 or UTC+4:30. Let's approximate or use DB time functions.
        // For MVP, we'll use a simplified logic: Get the first equity record of the current UTC day (or closely matching logic).
        // A better approach is to store "daily_starting_equity" in a separate table or cache.
        
        // Let's get the starting equity for the "day"
        // We'll define "day" as starting at 00:00 UTC for simplicity unless strict Tehran time is required now.
        // The architecture says Asia/Tehran 01:30.
        
        const resetTimeRes = await query(`
            SELECT equity FROM equity_history 
            WHERE account_instance_id = $1 
            AND recorded_at >= (NOW() AT TIME ZONE 'Asia/Tehran')::date + INTERVAL '1 hour 30 minutes' - INTERVAL '1 day'
            ORDER BY recorded_at ASC
            LIMIT 1
        `, [instanceId]);

        let startEquity = balance; // Default to current balance if no history
        if (resetTimeRes.rows.length > 0) {
            startEquity = parseFloat(resetTimeRes.rows[0].equity);
        }

        const dailyDD = ((startEquity - equity) / startEquity) * 100;
        
        if (dailyDD >= 5.0) {
            await this.logViolation(instanceId, 'daily_drawdown', 5.0, dailyDD, 'breach');
        } else if (dailyDD >= 4.0) {
            await this.logViolation(instanceId, 'daily_drawdown', 5.0, dailyDD, 'warning');
        }

        // 4. Check Max Total Drawdown (10%)
        // We need initial balance
        const initBalRes = await query('SELECT initial_balance_value FROM initial_balances WHERE account_id = (SELECT account_id FROM account_instances WHERE id = $1)', [instanceId]);
        
        if (initBalRes.rows.length > 0) {
            const initialBalance = parseFloat(initBalRes.rows[0].initial_balance_value);
            const totalDD = ((initialBalance - equity) / initialBalance) * 100;

            if (totalDD >= 10.0) {
                await this.logViolation(instanceId, 'max_drawdown', 10.0, totalDD, 'breach');
            }
        }

    } catch (error) {
        console.error(`Rule Check Error for ${login}:`, error);
    }
  }

  static async logViolation(instanceId: string, rule: string, threshold: number, current: number, severity: string) {
    // Check if recently logged to avoid spam
    const recent = await query(
        `SELECT id FROM rule_violations 
         WHERE account_instance_id = $1 AND rule_type = $2 AND severity = $3 
         AND detected_at > NOW() - INTERVAL '1 hour'`,
        [instanceId, rule, severity]
    );

    if (recent.rows.length === 0) {
        await query(
            `INSERT INTO rule_violations (account_instance_id, rule_type, threshold_value, current_value, severity)
             VALUES ($1, $2, $3, $4, $5)`,
            [instanceId, rule, threshold, current, severity]
        );
        console.log(`VIOLATION DETECTED: ${rule} on ${instanceId} - ${severity}`);
    }
  }
}
