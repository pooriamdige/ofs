import { query } from './db/index.js'
import { RulesService } from './services/rules.service.js'
import dotenv from 'dotenv'

dotenv.config()

const runWorker = async () => {
  console.log('Starting Rule Engine Worker...');
  
  while (true) {
    try {
      console.log('Checking rules...');
      
      // Fetch active accounts
      const accounts = await query(`
        SELECT ai.id, ai.encrypted_investor_pass, a.login, a.server 
        FROM account_instances ai
        JOIN accounts a ON ai.account_id = a.id
        WHERE ai.status = 'active'
      `);

      for (const account of accounts.rows) {
        // Run checks in parallel or sequence (sequence is safer for rate limits)
        await RulesService.checkRules(
            account.id, 
            account.login, 
            account.server, 
            account.encrypted_investor_pass
        );
      }

      console.log(`Checked ${accounts.rows.length} accounts.`);
      
    } catch (error) {
      console.error('Worker Error:', error);
    }

    // Wait 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

runWorker();
