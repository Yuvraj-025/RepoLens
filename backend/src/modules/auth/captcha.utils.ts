import * as crypto from 'crypto';

const CAPTCHA_SECRET = process.env.JWT_SECRET || 'super-secret-captcha-key';
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory registry to prevent CAPTCHA replay attacks
const consumedCaptchasMap = new Map<string, number>();

function markCaptchaAsUsed(signature: string, expiresAt: number) {
  consumedCaptchasMap.set(signature, expiresAt);
}

function isCaptchaUsed(signature: string): boolean {
  return consumedCaptchasMap.has(signature);
}

function cleanExpiredCaptchas() {
  const now = Date.now();
  for (const [sig, exp] of consumedCaptchasMap.entries()) {
    if (now > exp) {
      consumedCaptchasMap.delete(sig);
    }
  }
}

export interface CaptchaResult {
  token: string;
  svg: string;
}

export function generateCaptchaSvg(theme: 'green' | 'cyan' = 'green'): CaptchaResult {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(crypto.randomInt(0, chars.length));
  }

  const width = 200;
  const height = 60;
  const color = theme === 'green' ? '#00ff41' : '#00ffff';
  const lineColor = theme === 'green' ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 255, 0.3)';

  // Build a simple SVG path/text image with rotation and noise lines
  let noiseLines = '';
  for (let i = 0; i < 8; i++) {
    const x1 = crypto.randomInt(0, width);
    const y1 = crypto.randomInt(0, height);
    const x2 = crypto.randomInt(0, width);
    const y2 = crypto.randomInt(0, height);
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lineColor}" stroke-width="2" />`;
  }

  let textGroup = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 20 + i * 28;
    const y = 35 + crypto.randomInt(-5, 5);
    const rot = crypto.randomInt(-20, 20); // rotation in degrees
    textGroup += `<text x="${x}" y="${y}" fill="${color}" font-size="34" font-family="'VT323', monospace" font-weight="bold" transform="rotate(${rot} ${x} ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: rgba(0,0,0,0.95); border: 2px solid ${color}80;">
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.95)" />
    ${noiseLines}
    ${textGroup}
  </svg>`;

  const expiresAt = Date.now() + CAPTCHA_TTL_MS;
  const signature = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${text.toLowerCase()}:${expiresAt}`)
    .digest('hex');

  const token = Buffer.from(JSON.stringify({ expiresAt, signature })).toString('base64');

  return { token, svg };
}

export function verifyCaptcha(token: string, userInput: string): boolean {
  // Purge expired signatures to free memory
  cleanExpiredCaptchas();

  try {
    if (!token || !userInput) return false;
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { expiresAt, signature } = decoded;

    if (Date.now() > expiresAt) {
      return false; // Expired
    }

    if (isCaptchaUsed(signature)) {
      return false; // Replay attack prevention
    }

    const expectedSignature = crypto
      .createHmac('sha256', CAPTCHA_SECRET)
      .update(`${userInput.toLowerCase().trim()}:${expiresAt}`)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    if (isValid) {
      markCaptchaAsUsed(signature, expiresAt);
    }
    return isValid;
  } catch (e) {
    return false;
  }
}
