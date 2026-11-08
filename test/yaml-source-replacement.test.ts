// SPDX-License-Identifier: MPL-2.0
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeYamlLineEndings, replaceYamlSourceRange} from '../src/yaml-preview-location.ts';

test('replacing a normalized range preserves the surrounding CRLF and matches the original snapshot', () => {
    const source = 'title: 📚開始\r\nnext: 開始\r\n';
    const normalized = normalizeYamlLineEndings(source);
    const expectedText = '開始\nnext';
    const start = normalized.indexOf(expectedText);
    const range = {start, end: start + expectedText.length, expectedText};
    assert.equal(replaceYamlSourceRange(source, range, normalized, '続き\r\nthen'), 'title: 📚続き\r\nthen: 開始\r\n');
    assert.equal(replaceYamlSourceRange(source.replace('title', 'other'), range, normalized, '差し替え'), undefined);
    assert.equal(replaceYamlSourceRange(source, {...range, start: 0}, normalized, '差し替え'), undefined);
});
