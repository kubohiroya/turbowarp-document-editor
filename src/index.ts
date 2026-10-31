import type {DocumentEditorOptions} from './types.ts';
export type {DocumentEditorOptions, DocumentAdapter, DocumentRegistry, DocumentReference} from './types.ts';
import {mountYamlEditor} from './client.ts';
import {documentEditorStyles} from './styles.ts';
export {documentEditorStyles};
export {registerDocumentSourceRootHatShape} from '@kubohiroya/turbowarp-document-source';
export {readYamlEditorFlags as readDocumentEditorFlags} from './feature-flags.ts';

export function mountDocumentEditor(options: DocumentEditorOptions) {
    const doc = options.document || globalThis.document;
    if (options.injectStyles !== false && !doc.getElementById('turbowarp-document-editor-style')) {
        const style = doc.createElement('style');
        style.id = 'turbowarp-document-editor-style';
        style.textContent = documentEditorStyles;
        doc.head.append(style);
    }
    return mountYamlEditor(options);
}
