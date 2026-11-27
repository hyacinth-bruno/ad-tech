import { readFile, writeFile, stat, rename, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { scopes, isCredential, readCredentials, writeCredentials } from './keychain.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dryRun = process.argv.slice(2).includes('--dry-run');

async function main() {
  const plans = [];
  for (const [scope, relative] of Object.entries(scopes)) {
    const file = path.join(root, relative);
    let content;
    try { content = await readFile(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const values = dotenv.parse(content);
    const credentials = Object.fromEntries(Object.entries(values).filter(([name, value]) => value && isCredential(name, value)));
    const remaining = content.split(/\r?\n/).filter((line) => {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/);
      return !match || !isCredential(match[1], values[match[1]] ?? '');
    }).join('\n');
    // Reject multiline secret assignments before changing anything; dotenv
    // supports them, but deleting only their opening line would leave fragments.
    for (const [name, value] of Object.entries(credentials)) {
      if (value.includes('\n') || value.includes('\r') || remaining.includes(value)) {
        throw new Error('Multiline or repeated credential values require manual cleanup before migration. No environment files were changed.');
      }
    }
    plans.push({ scope, file, credentials, remaining, mode: (await stat(file)).mode & 0o777 });
  }
  const admin = plans.find(p => p.scope === 'campaign-api')?.credentials.ALGOLIA_ADMIN_API_KEY;
  const browser = plans.find(p => p.scope === 'web')?.credentials.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
  if (admin && admin === browser) throw new Error('The browser must use a search-only key, not the admin key. No credentials were migrated.');
  if (dryRun) {
    for (const plan of plans) console.log(`${plan.scope}: ${Object.keys(plan.credentials).length} credential values to migrate.`);
    return;
  }
  // Verify every write before removing any original values.
  for (const plan of plans) {
    if (!Object.keys(plan.credentials).length) continue;
    const merged = { ...readCredentials(plan.scope), ...plan.credentials };
    writeCredentials(plan.scope, merged);
  }
  for (const plan of plans) {
    if (!Object.keys(plan.credentials).length) continue;
    const temporary = `${plan.file}.keychain-migration`;
    try {
      // This temporary file contains only the already-sanitized configuration.
      await writeFile(temporary, '# Credentials are loaded from macOS Keychain by the root npm scripts.\n' + plan.remaining, { mode: plan.mode & 0o600, flag: 'wx' });
      await rename(temporary, plan.file);
    } finally { await unlink(temporary).catch(() => {}); }
    console.log(`${plan.scope}: ${Object.keys(plan.credentials).length} values verified in Keychain and removed from its environment file.`);
  }
  console.log('Keychain migration complete. No credential values were printed.');
}
main().catch(() => { console.error('Credential migration failed. Original values remain unless already verified in Keychain. Check that the login keychain is unlocked and run again.'); process.exitCode = 1; });
