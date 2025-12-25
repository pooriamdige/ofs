import crypto from 'crypto';

const HMAC_SECRET = process.env.HMAC_SECRET || 'your-hmac-secret-key';

/**
 * Generate HMAC signature for a payload
 */
export const generateSignature = (payload: any): string => {
  const data = JSON.stringify(payload);
  return crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
};

/**
 * Verify HMAC signature
 */
export const verifySignature = (payload: any, signature: string): boolean => {
  const expectedSignature = generateSignature(payload);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};
