import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {readDocumentEditorFlags, documentEditorStyles} from '../src/index.js';

test('startup controls are immutable, explicit and default off', () => {
    for (const value of ['', '?twPlusYamlEditor=true', '?twPlusDocumentSource=0']) {
        assert.deepEqual(readDocumentEditorFlags(value), {embeddedYamlEditor: false, documentSources: false});
    }
    const flags = readDocumentEditorFlags('?twPlusYamlEditor=1&twPlusDocumentSource=1');
    assert(Object.isFrozen(flags));
    assert.deepEqual(flags, {embeddedYamlEditor: true, documentSources: true});
});

test('the browser entry is host-independent and the injected CSS equals the optional stylesheet', async () => {
    assert.equal(documentEditorStyles, await fs.readFile(new URL('../src/ui.css', import.meta.url), 'utf8'));
    const result = await build({entryPoints: [new URL('../src/index.js', import.meta.url).pathname], bundle: true,
        platform: 'browser', format: 'esm', write: false, metafile: true, logLevel: 'silent'});
    const inputs = Object.keys(result.metafile.inputs);
    assert(!inputs.some(input => /(?:turbowarp-(?:plus-editor|kamishibai-app)|scratch-(?:gui|vm|blocks)|node\/(?:host|vscode|schema)|source-documents|yaml-json)/u.test(input)), inputs.join('\n'));
    const manifest = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(manifest.main, manifest.exports['.']);
    assert(!Object.keys(manifest.dependencies).some(name => /kamishibai|plus-editor|scratch-(?:vm|gui)/u.test(name)));
});

test('Webpack 4 adapter preserves the host config and applies to each compilation', async () => {
    const {withDocumentEditorWebpack4} = await import('../webpack4.cjs');
    const rule = {test: /\.js$/, loader: 'babel-loader', include: '/host/src'};
    const config = {module: {rules: [rule]}, resolve: {alias: {'existing$': '/host/existing.js'}}};
    const [adapted] = withDocumentEditorWebpack4([config]);
    assert.equal(adapted.resolve.alias['existing$'], config.resolve.alias['existing$']);
    assert.equal(config.module.rules[0].include, '/host/src');
    for (const name of ['turbowarp-document-editor$', 'turbowarp-document-source/project-views$', 'turbowarp-document-data/composition$']) {
        const filename = adapted.resolve.alias['@kubohiroya/' + name];
        assert((await fs.stat(filename)).isFile());
    }
    assert(adapted.module.rules[0].include.length > 1);
});
