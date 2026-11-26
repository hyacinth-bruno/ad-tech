import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createServer as httpServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('MCP discovery, image upload, draft creation and API errors over stdio', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'retail-mcp-'));
  const image = path.join(directory, 'photo.png');
  await writeFile(image, Buffer.from([137,80,78,71,13,10,26,10]));
  const requests = [];
  const api = httpServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ url: req.url, body: Buffer.concat(chunks) });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/assets') res.end(JSON.stringify({ path: '/assets/photo.png' }));
    else if (req.url === '/campaigns' && req.method === 'POST') res.end(JSON.stringify({ _id: 'a'.repeat(24), status: 'draft', ...JSON.parse(Buffer.concat(chunks)) }));
    else if (req.url === '/campaign-schema') res.end(JSON.stringify({ type: 'object' }));
    else { res.statusCode = 503; res.end(JSON.stringify({ error: 'unavailable' })); }
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${api.address().port}`;
  const transport = new StdioClientTransport({ command: process.execPath, args: [new URL('./index.mjs', import.meta.url).pathname], env: { ...process.env, RETAIL_MEDIA_API_URL: base, RETAIL_MEDIA_UPLOAD_DIR: directory } });
  const client = new Client({ name: 'integration-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 5);
    assert.equal((await client.callTool({ name: 'campaign_schema', arguments: {} })).isError, undefined);
    const uploaded = await client.callTool({ name: 'upload_image', arguments: { filePath: image } });
    assert.equal(JSON.parse(uploaded.content[0].text).imageUrl, `${base}/assets/photo.png`);
    const created = await client.callTool({ name: 'create_ad', arguments: { campaign: { headline: 'Photo campaign', imageUrl: `${base}/assets/photo.png` } } });
    assert.equal(JSON.parse(created.content[0].text).campaign.status, 'draft');
    assert.equal(JSON.parse(requests.find(r => r.url === '/campaigns').body).headline, 'Photo campaign');
    assert.equal((await client.callTool({ name: 'list_campaigns', arguments: {} })).isError, true);
    assert.equal((await client.callTool({ name: 'upload_image', arguments: { filePath: new URL('../package.json', import.meta.url).pathname } })).isError, true);
    assert.equal((await client.callTool({ name: 'set_ad_status', arguments: { id: '../bad', status: 'active' } })).isError, true);
  } finally {
    await client.close();
    await new Promise(resolve => api.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
