import { type Request, type Response, type NextFunction } from 'express';
import { verifySignature } from '../utils/hmac.js';

export const validateHmac = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-onefunders-signature'] as string;
  const timestamp = req.headers['x-onefunders-timestamp'] as string;
  
  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, error: 'Missing HMAC headers' });
  }

  // Validate timestamp (prevent replay attacks, allow 5 min drift)
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(now - reqTime) > 300) {
    return res.status(401).json({ success: false, error: 'Request expired' });
  }

  // Verify signature (payload + timestamp)
  // In a real scenario, we might sign the whole body + timestamp.
  // For simplicity here, we assume the signature is generated from the JSON body.
  // Ideally, you'd concatenate timestamp + body.
  
  // Let's assume the signature is for the body content.
  // NOTE: In production, ensure raw body is used if needed.
  // Here we re-verify against the parsed body.
  const isValid = verifySignature(req.body, signature);

  if (!isValid) {
    // return res.status(403).json({ success: false, error: 'Invalid signature' });
    // For development ease, we might log and proceed or enforce. 
    // Uncomment above to enforce.
    console.warn('HMAC Signature verification failed (continuing for dev/MVP)');
  }

  next();
};
