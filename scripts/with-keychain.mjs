import { spawn } from 'node:child_process';
import { readCredentials } from './keychain.mjs';

const [scope, separator, command, ...args] = process.argv.slice(2);
if (separator !== '--' || !command) {
  console.error('Usage: node scripts/with-keychain.mjs <scope> -- <command> [args]');
  process.exit(1);
}
try {
  const stored = process.platform === 'darwin' ? readCredentials(scope) : {};
  const child = spawn(command, args, { stdio: 'inherit', env: { ...stored, ...process.env }, shell: false });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('Could not start the requested service.'); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1); });
} catch {
  console.error('Cannot load local credentials from macOS Keychain. Unlock it and retry.');
  process.exitCode = 1;
}
