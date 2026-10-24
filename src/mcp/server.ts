import { Buffer } from 'node:buffer';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { generateDiff } from '../lib/diff.js';

// Initial bounds for the existing quadratic LCS implementation, per input.
const MAX_INPUT_BYTES = 32 * 1024;
const MAX_INPUT_LINES = 500;

const textSchema = z.string()
  .max(MAX_INPUT_BYTES, 'Input exceeds 32 KiB.')
  .refine(value => Buffer.byteLength(value, 'utf8') <= MAX_INPUT_BYTES, 'Input exceeds 32 KiB in UTF-8.')
  .refine(value => value.split('\n').length <= MAX_INPUT_LINES, 'Input exceeds 500 lines.')
  .describe('Text to compare. Empty string accepted. Maximum 500 LF-separated lines and 32 KiB in UTF-8.');

function createServer(): McpServer {
  const server = new McpServer({ name: 'text-diff-checker', version: '0.1.0' });
  server.registerTool('compare_texts', {
    description: 'Compare before and after text by line using LCS. Returns common, removed and added lines; changes are removal plus addition. Preserves empty lines, trailing LF and CR characters; does not normalize text.',
    inputSchema: z.object({ before: textSchema, after: textSchema }),
    outputSchema: z.object({
      lines: z.array(z.object({
        type: z.enum(['common', 'added', 'removed']),
        value: z.string(),
      })),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async ({ before, after }) => {
    const result = { lines: generateDiff(before, after) };
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    };
  });
  return server;
}

try {
  const handle = serveStdio(createServer, {
    onerror: () => console.error('text-diff-checker MCP transport error.'),
  });
  console.error('text-diff-checker MCP ready.');
  const shutdown = () => {
    void handle.close().catch(() => {
      console.error('text-diff-checker MCP shutdown failed.');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  // Never interpolate exceptions or input text into diagnostics.
  console.error('text-diff-checker MCP startup failed.');
  process.exitCode = 1;
}
