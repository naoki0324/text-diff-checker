import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readdir, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const entry = fileURLToPath(new URL('../dist-mcp/mcp/server.js', import.meta.url));

async function connect(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'text-diff-mcp-'));
  const child = spawn(process.execPath, [entry], { cwd, env: {}, stdio: 'pipe' });
  const exited = once(child, 'close');
  let stderr = '';
  let buffer = '';
  let id = 0;
  const pending = new Map();
  const protocolErrors = [];
  child.stderr.setEncoding('utf8').on('data', text => { stderr += text; });
  child.stdout.setEncoding('utf8').on('data', text => {
    buffer += text;
    let end;
    while ((end = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      try {
        const message = JSON.parse(line);
        assert.equal(message.jsonrpc, '2.0');
        if (pending.has(message.id)) {
          pending.get(message.id).resolve(message);
          pending.delete(message.id);
        }
      } catch (error) {
        protocolErrors.push(error);
        for (const waiter of pending.values()) waiter.reject(error);
        pending.clear();
      }
    }
  });
  child.on('error', error => {
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  });
  child.on('exit', () => {
    for (const waiter of pending.values()) waiter.reject(new Error('MCP exited before responding'));
    pending.clear();
  });
  // Avoid an unhandled EPIPE when the entry does not exist during the Red step.
  child.stdin.on('error', error => {
    for (const waiter of pending.values()) waiter.reject(error);
    pending.clear();
  });
  t.after(async () => {
    child.stdin.end();
    const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
    try {
      const [code, signal] = await exited;
      assert.equal(signal, null);
      assert.equal(code, 0);
      assert.equal(buffer, '');
      assert.deepEqual(protocolErrors, []);
      assert.equal(stderr, 'text-diff-checker MCP ready.\ntext-diff-checker MCP transport error.\n');
      assert.deepEqual(await readdir(cwd), []);
    } finally {
      clearTimeout(timer);
      await rmdir(cwd);
    }
  });
  function request(method, params) {
    const requestId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n');
    });
  }
  const initialize = await request('initialize', {
    protocolVersion: '2025-06-18', capabilities: {},
    clientInfo: { name: 'text-diff-checker-test', version: '1.0.0' },
  });
  assert.ok(initialize.result, 'initialize must succeed');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  return {
    request,
    sendMalformed: () => {
      // SDK skips JSON syntax errors; a JSON string is also invalid JSON-RPC
      // and exercises the diagnostic callback without exposing its value.
      child.stdin.write('synthetic-private-marker-秘密-invalid-json\n');
      child.stdin.write(JSON.stringify('synthetic-private-marker-秘密-invalid-rpc') + '\n');
    },
    compare: args => request('tools/call', { name: 'compare_texts', arguments: args }),
  };
}

function assertSuccess(message, lines) {
  assert.equal(message.error, undefined);
  assert.notEqual(message.result?.isError, true);
  assert.deepEqual(message.result.structuredContent, { lines });
  assert.deepEqual(message.result.content, [{ type: 'text', text: JSON.stringify({ lines }) }]);
}

test('stdio: initialize, discovery, comparison, validation, recovery, EOF and no input logs/files', { timeout: 15000 }, async t => {
  const { request, compare, sendMalformed } = await connect(t);
  await t.test('ツールはcompare_texts一つで必須文字列を宣言', async () => {
    const response = await request('tools/list', {});
    assert.equal(response.error, undefined);
    assert.deepEqual(response.result.tools.map(tool => tool.name), ['compare_texts']);
    const tool = response.result.tools[0];
    assert.deepEqual([...tool.inputSchema.required].sort(), ['after', 'before']);
    assert.equal(tool.inputSchema.properties.before.type, 'string');
    assert.equal(tool.inputSchema.properties.after.type, 'string');
    assert.ok(tool.outputSchema);
  });
  const cases = [
    ['同一', 'a', 'a', [{ type: 'common', value: 'a' }]],
    ['追加', 'a', 'a\nb', [{ type: 'common', value: 'a' }, { type: 'added', value: 'b' }]],
    ['削除', 'a\nb', 'a', [{ type: 'common', value: 'a' }, { type: 'removed', value: 'b' }]],
    ['変更・日本語', 'りんご\nみかん', 'りんご\nぶどう', [
      { type: 'common', value: 'りんご' }, { type: 'removed', value: 'みかん' },
      { type: 'added', value: 'ぶどう' },
    ]],
    ['空文字同士', '', '', [{ type: 'common', value: '' }]],
    ['片側空文字', '', 'a', [{ type: 'removed', value: '' }, { type: 'added', value: 'a' }]],
    ['末尾改行', 'a', 'a\n', [{ type: 'common', value: 'a' }, { type: 'added', value: '' }]],
    ['CRLF', 'a\r\n', 'a\n', [
      { type: 'removed', value: 'a\r' }, { type: 'added', value: 'a' }, { type: 'common', value: '' },
    ]],
  ];
  for (const [name, before, after, expected] of cases) {
    await t.test(name, async () => assertSuccess(await compare({ before, after }), expected));
  }
  await t.test('欠落・型不正はエラー', async () => {
    for (const field of ['before', 'after']) {
      for (const value of [undefined, null, 123, false, [], {}]) {
        const args = { before: '', after: '' };
        if (value === undefined) delete args[field];
        else args[field] = value;
        const response = await compare(args);
        assert.ok(response.error || response.result?.isError === true);
      }
    }
  });
  await t.test('500行・32KiBの境界は受理、超過は両フィールドで拒否', async () => {
    const lines = Array(500).fill('a');
    assertSuccess(await compare({ before: lines.join('\n'), after: lines.join('\n') }),
      lines.map(value => ({ type: 'common', value })));
    const boundary = 'あ'.repeat(10922) + 'aa';
    assert.equal(Buffer.byteLength(boundary, 'utf8'), 32768);
    assertSuccess(await compare({ before: boundary, after: boundary }), [{ type: 'common', value: boundary }]);
    for (const field of ['before', 'after']) {
      for (const value of [Array(501).fill('a').join('\n'), 'a'.repeat(32769), boundary + 'あ']) {
        const response = await compare({ before: '', after: '', [field]: value });
        assert.ok(response.error || response.result?.isError === true);
      }
    }
  });
  await t.test('不正ツール名はエラー', async () => {
    const response = await request('tools/call', { name: 'translate', arguments: {} });
    assert.ok(response.error || response.result?.isError === true);
  });
  await t.test('arguments欠落はエラー', async () => {
    const response = await request('tools/call', { name: 'compare_texts' });
    assert.ok(response.error || response.result?.isError === true);
  });
  await t.test('不正JSON・不正RPCの本文は診断ログへ出さない', async () => {
    sendMalformed();
    assertSuccess(await compare({ before: '', after: '' }), [{ type: 'common', value: '' }]);
  });
  await t.test('エラー後も本文を保持して正常応答', async () => {
    const marker = 'synthetic-private-marker-秘密-123';
    assertSuccess(await compare({ before: marker, after: marker }), [{ type: 'common', value: marker }]);
  });
});

test('公式MCPクライアントからstdioで実プロセスを呼べる', { timeout: 10000 }, async t => {
  const { Client } = await import('@modelcontextprotocol/client');
  const { StdioClientTransport } = await import('@modelcontextprotocol/client/stdio');
  const client = new Client({ name: 'official-sdk-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env: {}, stderr: 'pipe' });
  t.after(() => client.close());
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['compare_texts']);
  const result = await client.callTool({ name: 'compare_texts', arguments: { before: '前', after: '後' } });
  assert.notEqual(result.isError, true);
  assert.deepEqual(result.structuredContent, { lines: [
    { type: 'removed', value: '前' }, { type: 'added', value: '後' },
  ] });
});
