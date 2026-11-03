// SPDX-License-Identifier: MPL-2.0
// Test-only document owner moved from turbowarp-plus-editor test/document-sources.browser.ts.
// The shared registry supplies source locations to any provider, not one App.
import YAML from 'yaml';
import {getDocumentSourceRegistry, installDocumentSourceMarker, type DocumentSourceVM} from '@kubohiroya/turbowarp-document-source';
import type {DocumentSnapshot, HostObject} from '../../src/types.ts';

export const owner = 'twpesourcefixture';
export const source = (volume = 10) => `# preserved comment\nvolume: ${volume}\nmode: rehearsal\n`;

export function createFixtureProject() {
    const project: HostObject = {
        targets: [{isStage: true, name: 'Stage', blocks: {}, comments: {}}],
        extensionStorage: {[owner]: {documents: {settings: source()}}, unrelated: {keep: 'unchanged'}},
        extensions: [owner],
        extensionURLs: {[owner]: 'data:unchanged'},
    };
    installDocumentSourceMarker(project, {opcode: `${owner}_sourceDocument`, reference: {providerId: owner, documentId: 'settings'}});
    return project;
}

function check(text: string) {
    const value = YAML.parse(text);
    if (value === null || typeof value !== 'object' || !Number.isInteger(value.volume)) throw new Error('Settings must define an integer volume.');
}

// The owner validates and commits; the editor under test only shows and stages its decisions.
export function registerFixtureProvider(vm: HostObject, fetch: typeof globalThis.fetch) {
    const documents = () => vm.runtime.extensionStorage[owner].documents;
    const provider = {
        id: owner,
        hatOpcodes: [owner + '_sourceDocument'],
        list: () => [{documentId: 'settings', filename: 'settings.yml', format: 'yaml' as const,
            representations: [{kind: 'yaml-blocks', label: 'YAML blocks', fromSource: true, toSource: true}]}],
        open() {
            const prepared = new WeakSet<object>();
            return {
                inspect: () => ({available: true}),
                capture: () => Object.freeze({source: documents().settings, sourceName: 'settings.yml'}),
                async prepare(_snapshot: DocumentSnapshot, text: string) {
                    check(text);
                    const value = Object.freeze({source: text});
                    prepared.add(value);
                    return value;
                },
                async commit(_snapshot: DocumentSnapshot, value: {source: string}) {
                    if (!prepared.has(value)) throw new Error('Unknown prepared edit.');
                    documents().settings = value.source;
                    vm.runtime.emitProjectChanged();
                    return {source: value.source};
                },
                dispose() {},
            };
        },
    };
    return getDocumentSourceRegistry(vm as DocumentSourceVM).register(provider, {
        sourceStorageId: owner,
        dialogTitle: {ja: '設定データ', en: 'Settings data'},
        fetch,
        buildSourceCandidate({project: copy, reference, source: text}) {
            check(text);
            copy.extensionStorage[owner].documents[reference.documentId] = text;
            return {project: copy, source: text};
        },
    });
}
