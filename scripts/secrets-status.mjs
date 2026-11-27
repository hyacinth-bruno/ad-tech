import { scopes, readCredentials } from './keychain.mjs';
try {
  for (const scope of Object.keys(scopes)) console.log(`${scope}: ${Object.keys(readCredentials(scope)).join(', ') || 'no saved credentials'}`);
} catch { console.error('Cannot read macOS Keychain. Unlock it and retry.'); process.exitCode = 1; }
