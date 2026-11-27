import test from 'node:test';
import assert from 'node:assert/strict';
import { readCredentials, writeCredentials, keychainService } from './keychain.mjs';

const credentials = { ALGOLIA_ADMIN_API_KEY: 'unit-test-placeholder-value' };
const encoded = Buffer.from(JSON.stringify(credentials)).toString('base64');

test('writes through stdin and verifies the saved value without exposing it in argv', () => {
  const calls = [];
  writeCredentials('campaign-api', credentials, (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: args[0] === '-i' ? '' : encoded + '\n' };
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, '/usr/bin/security');
  assert.deepEqual(calls[0].args, ['-i']);
  assert.ok(calls[0].options.input.includes(encoded));
  assert.ok(!calls[0].options.input.includes(' -A'));
  for (const call of calls) {
    assert.ok(!call.args.join(' ').includes(credentials.ALGOLIA_ADMIN_API_KEY));
    assert.ok(!call.args.join(' ').includes(encoded));
  }
  assert.ok(calls[1].args.includes(keychainService));
});

test('rejects a failed write verification so local values can be retained', () => {
  assert.throws(() => writeCredentials('web', credentials, (_command, args) => ({ status: 0, stdout: args[0] === '-i' ? '' : Buffer.from('{}').toString('base64') })), /verification failed/);
});

test('returns no credentials only when the Keychain item is absent', () => {
  assert.deepEqual(readCredentials('web', () => ({ status: 44 })), {});
  assert.throws(() => readCredentials('web', () => ({ status: 1, stderr: 'sensitive diagnostic' })), /Cannot read macOS Keychain/);
});

test('rejects corrupted records and non-credential environment overrides', () => {
  assert.throws(() => readCredentials('web', () => ({ status: 0, stdout: 'not a record' })), /Invalid Keychain/);
  const bad = Buffer.from(JSON.stringify({ NODE_OPTIONS: '--require bad.js' })).toString('base64');
  assert.throws(() => readCredentials('web', () => ({ status: 0, stdout: bad })), /Invalid Keychain/);
});

test('rejects unknown scopes and NUL bytes before calling security', () => {
  const never = () => assert.fail('security should not run');
  assert.throws(() => readCredentials('other', never), /Unknown credential scope/);
  assert.throws(() => writeCredentials('web', { API_KEY: 'bad\0value' }, never), /Invalid Keychain/);
});

test('does not include captured security diagnostics in errors', () => {
  assert.throws(() => writeCredentials('campaign-api', credentials, () => ({ status: 1, stderr: encoded })), (error) => {
    assert.ok(!error.message.includes(encoded));
    assert.ok(!error.message.includes(credentials.ALGOLIA_ADMIN_API_KEY));
    return true;
  });
});
