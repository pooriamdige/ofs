import axios from 'axios'

const MT5_API_URL = process.env.MT5_API_URL || 'http://localhost:5000'

export class MT5Service {
  /**
   * Connect to an MT5 account
   */
  static async connect(login: string, password: string, server: string) {
    try {
      // Connect to MT5
      const response = await axios.get(`${MT5_API_URL}/Connect`, {
        params: {
          user: login,
          password: password,
          host: server,
          port: 443 
        },
        timeout: 10000 // 10s timeout
      })
      return response.data
    } catch (error: any) {
      console.error('MT5 Connection Error:', error.message)
      // Return a friendly error structure or throw
      throw new Error(error.response?.data?.message || 'Failed to connect to MT5 server')
    }
  }

  /**
   * Get Account Summary
   */
  static async getAccountSummary(login: string) {
    try {
      const response = await axios.get(`${MT5_API_URL}/AccountSummary`, {
        params: { id: login },
        timeout: 5000
      })
      return response.data
    } catch (error: any) {
      console.error('MT5 Summary Error:', error.message)
      throw new Error('Failed to fetch account summary')
    }
  }

  /**
   * Get Order History (Example)
   */
  static async getOrderHistory(login: string, from: string, to: string) {
    try {
      const response = await axios.get(`${MT5_API_URL}/OrderHistory`, {
        params: { id: login, from, to },
        timeout: 10000
      })
      return response.data
    } catch (error: any) {
      console.error('MT5 History Error:', error.message)
      throw new Error('Failed to fetch order history')
    }
  }
}
