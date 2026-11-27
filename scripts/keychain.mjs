import { spawnSync } from 'node:child_process';

export const keychainService = 'com.northstar.retail-media-demo.credentials';
export const scopes = {
  'campaign-api': 'services/campaign-api/.env',
  'ad-delivery-api': 'services/ad-delivery-api/.env',
  worker: 'services/worker/.env',
  web: 'apps/web/.env.local',
};

export function isCredential(name, value = '') {
  if (/KEY|TOKEN|SECRET|PASSWORD|ALGOLIA_APP_ID/.test(name)) return true;
  if (/(?:URI|URL)$/.test(name)) {
    try { const url = new URL(value); return Boolean(url.username || url.password); } catch {}
  }
  return false;
}

function checkScope(scope) {
  if (!Object.hasOwn(scopes, scope)) throw new Error('Unknown credential scope.');
}

function validate(credentials) {
  if (!credentials || Array.isArray(credentials) || typeof credentials !== 'object') throw new Error('Invalid Keychain credential record.');
  for (const [name, value] of Object.entries(credentials)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || typeof value !== 'string' || value.includes('\0') || !isCredential(name, value)) {
      throw new Error('Invalid Keychain credential record.');
    }
  }
  return credentials;
}

export function readCredentials(scope, run = spawnSync) {
  checkScope(scope);
  if (process.platform !== 'darwin') throw new Error('This credential loader requires macOS Keychain. Supply environment variables directly on other systems.');
  const result = run('/usr/bin/security', ['find-generic-password', '-a', scope, '-s', keychainService, '-w'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status === 44) return {};
  if (result.error || result.status !== 0) throw new Error('Cannot read macOS Keychain. Unlock your login keychain and try again.');
  try { return validate(JSON.parse(Buffer.from(result.stdout.trim(), 'base64').toString('utf8'))); }
  catch { throw new Error('Invalid Keychain credential record.'); }
}

export function writeCredentials(scope, credentials, run = spawnSync) {
  checkScope(scope);
  validate(credentials);
  if (process.platform !== 'darwin') throw new Error('This credential setup requires macOS Keychain.');
  const encoded = Buffer.from(JSON.stringify(credentials), 'utf8').toString('base64');
  // Feed the credential through stdin: never put it in argv, a temporary file,
  // console output, or an unrestricted Keychain access rule.
  const input = `add-generic-password -U -a "${scope}" -s "${keychainService}" -w "${encoded}"\n`;
  const result = run('/usr/bin/security', ['-i'], { input, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Cannot write macOS Keychain. Unlock your login keychain and try again.');
  const saved = readCredentials(scope, run);
  if (JSON.stringify(saved) !== JSON.stringify(credentials)) throw new Error('Keychain verification failed. Environment files have not been cleaned.');
}
