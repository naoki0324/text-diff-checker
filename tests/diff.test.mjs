import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateDiff } from '../dist/test/lib/diff.js';

const cases = [
  {
    name: '同一の全行をcommonとして返す',
    before: 'a\nb', after: 'a\nb',
    expected: [{ type: 'common', value: 'a' }, { type: 'common', value: 'b' }],
  },
  {
    name: '途中の行追加',
    before: 'a\nc', after: 'a\nb\nc',
    expected: [
      { type: 'common', value: 'a' }, { type: 'added', value: 'b' },
      { type: 'common', value: 'c' },
    ],
  },
  {
    name: '途中の行削除',
    before: 'a\nb\nc', after: 'a\nc',
    expected: [
      { type: 'common', value: 'a' }, { type: 'removed', value: 'b' },
      { type: 'common', value: 'c' },
    ],
  },
  {
    name: '行の変更は削除と追加',
    before: 'a\nb', after: 'a\nc',
    expected: [
      { type: 'common', value: 'a' }, { type: 'removed', value: 'b' },
      { type: 'added', value: 'c' },
    ],
  },
  {
    name: '空文字同士は空の共通行',
    before: '', after: '',
    expected: [{ type: 'common', value: '' }],
  },
  {
    name: '空文字からの変更も空行を保持',
    before: '', after: 'a',
    expected: [{ type: 'removed', value: '' }, { type: 'added', value: 'a' }],
  },
  {
    name: '空文字への変更も空行を保持',
    before: 'a', after: '',
    expected: [{ type: 'removed', value: 'a' }, { type: 'added', value: '' }],
  },
  {
    name: '日本語の行比較',
    before: 'りんご\nみかん', after: 'りんご\nぶどう',
    expected: [
      { type: 'common', value: 'りんご' }, { type: 'removed', value: 'みかん' },
      { type: 'added', value: 'ぶどう' },
    ],
  },
  {
    name: '末尾改行の追加は空行追加',
    before: 'a', after: 'a\n',
    expected: [{ type: 'common', value: 'a' }, { type: 'added', value: '' }],
  },
  {
    name: '末尾改行の削除は空行削除',
    before: 'a\n', after: 'a',
    expected: [{ type: 'common', value: 'a' }, { type: 'removed', value: '' }],
  },
  {
    name: '連続する空行と末尾改行を保持',
    before: '\n', after: '\n\n',
    expected: [
      { type: 'added', value: '' }, { type: 'common', value: '' },
      { type: 'common', value: '' },
    ],
  },
  {
    name: 'CRLFをLFへ正規化しない',
    before: 'a\r\n', after: 'a\n',
    expected: [
      { type: 'removed', value: 'a\r' }, { type: 'added', value: 'a' },
      { type: 'common', value: '' },
    ],
  },
  {
    name: '単独CRは行区切りにしない',
    before: 'a\rb', after: 'a\rb',
    expected: [{ type: 'common', value: 'a\rb' }],
  },
  {
    name: '繰り返し行のLCS同点規則を保持',
    before: 'a\nb\na', after: 'a\na\nb',
    expected: [
      { type: 'common', value: 'a' }, { type: 'removed', value: 'b' },
      { type: 'common', value: 'a' }, { type: 'added', value: 'b' },
    ],
  },
  {
    name: '空白やタブを除去しない',
    before: ' a\t', after: 'a',
    expected: [{ type: 'removed', value: ' a\t' }, { type: 'added', value: 'a' }],
  },
  {
    name: 'Unicodeの合成・分解表現を正規化しない',
    before: '\u304c', after: '\u304b\u3099',
    expected: [
      { type: 'removed', value: '\u304c' }, { type: 'added', value: '\u304b\u3099' },
    ],
  },
];

for (const { name, before, after, expected } of cases) {
  test(name, () => {
    const result = generateDiff(before, after);
    assert.deepEqual(result, expected);
    assert.deepEqual(
      result.filter(line => line.type !== 'added').map(line => line.value),
      before.split('\n'),
    );
    assert.deepEqual(
      result.filter(line => line.type !== 'removed').map(line => line.value),
      after.split('\n'),
    );
  });
}
