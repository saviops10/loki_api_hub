import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_SECRET) {
  console.error("[FATAL]: ENCRYPTION_KEY is not defined in environment variables.");
  process.exit(1);
}

const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return '{}';
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("Decryption failed:", e);
    return '{}';
  }
}

export function scrubData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const sensitiveKeys = ['password', 'token', 'access_token', 'apiKey', 'api_key', 'secret', 'authorization'];
  const scrubbed = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in scrubbed) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      scrubbed[key] = '********';
    } else if (typeof scrubbed[key] === 'object') {
      scrubbed[key] = scrubData(scrubbed[key]);
    }
  }
  return scrubbed;
}

export function globalErrorHandler(err: any, req: any, res: any, next: any) {
  const errorId = crypto.randomUUID();
  console.error(`[${errorId}]: ${err.stack || err.message}`);

  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      error: err.message,
      id: errorId,
      stack: err.stack
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    id: errorId
  });
}
