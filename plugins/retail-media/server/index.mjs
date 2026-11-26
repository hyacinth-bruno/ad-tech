import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';

const api = new URL(process.env.RETAIL_MEDIA_API_URL ?? 'http://localhost:4001');
const web = new URL(process.env.RETAIL_MEDIA_WEB_URL ?? 'http://localhost:3000');
// This demo API has no authentication. Keep the bridge on loopback.
for (const url of [api, web]) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !['http:', 'https:'].includes(url.protocol)) throw new Error('Only local demo URLs are supported');
}
async function request(route, method = 'GET', body, headers = {}) {
  const response = await fetch(new URL(route, api), {
    method, body: body === undefined ? undefined : typeof body === 'object' && !Buffer.isBuffer(body) ? JSON.stringify(body) : body,
    headers: { ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}), ...headers },
    signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  if (!response.ok) throw new Error(`Campaign API ${response.status}: ${(await response.text()).slice(0, 1000)}`);
  return response.json();
}
const tools = [
  { name: 'campaign_schema', description: 'Get required campaign fields and validation constraints before creating an ad.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_campaigns', description: 'List saved campaigns and their status.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'upload_image', description: 'Upload an attached PNG, JPEG or WebP from the configured RETAIL_MEDIA_UPLOAD_DIR. Maximum 5 MiB.', inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'], additionalProperties: false } },
  { name: 'create_ad', description: 'Save a draft ad using the campaign_schema. Copy is written by Codex; no model API is called.', inputSchema: { type: 'object', properties: { campaign: { type: 'object' } }, required: ['campaign'], additionalProperties: false } },
  { name: 'set_ad_status', description: 'Activate, pause or end an ad. Activate only when the user asks to publish.', inputSchema: { type: 'object', properties: { id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }, status: { enum: ['draft', 'active', 'paused', 'ended'] } }, required: ['id', 'status'], additionalProperties: false } },
];
export async function callTool(name, args = {}) {
  if (name === 'campaign_schema') return request('/campaign-schema');
  if (name === 'list_campaigns') return request('/campaigns');
  if (name === 'create_ad') {
    if (!args.campaign || typeof args.campaign !== 'object' || Array.isArray(args.campaign)) throw new Error('campaign object is required');
    const campaign = await request('/campaigns', 'POST', { ...args.campaign, status: 'draft' });
    return { campaign, browserUrl: web.href, message: 'Saved as a draft. Dashboard refreshes within five seconds.' };
  }
  if (name === 'set_ad_status') {
    if (!/^[a-fA-F0-9]{24}$/.test(args.id) || !['draft', 'active', 'paused', 'ended'].includes(args.status)) throw new Error('Invalid campaign id or status');
    return request(`/campaigns/${args.id}/status`, 'POST', { status: args.status });
  }
  if (name === 'upload_image') {
    if (!process.env.RETAIL_MEDIA_UPLOAD_DIR) throw new Error('Set RETAIL_MEDIA_UPLOAD_DIR to the folder containing the attached photos');
    if (typeof args.filePath !== 'string') throw new Error('filePath is required');
    const root = await realpath(process.env.RETAIL_MEDIA_UPLOAD_DIR);
    const file = await realpath(args.filePath);
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Image must be inside RETAIL_MEDIA_UPLOAD_DIR');
    const handle = await open(file, 'r');
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw new Error('Image must be a file under 5 MiB');
      const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
      const type = types[path.extname(file).toLowerCase()];
      if (!type) throw new Error('Use PNG, JPEG or WebP');
      const result = await request('/assets', 'POST', await handle.readFile(), { 'Content-Type': type });
      return { imageUrl: new URL(result.path, api).href };
    } finally { await handle.close(); }
  }
  throw new Error(`Unknown tool: ${name}`);
}
export function createServer() {
  const server = new Server({ name: 'retail-media', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try { return { content: [{ type: 'text', text: JSON.stringify(await callTool(params.name, params.arguments)) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
  });
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  await createServer().connect(new StdioServerTransport());
}
