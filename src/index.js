import {mountYamlEditor} from './client.js';
import {documentEditorStyles} from './styles.js';
export {documentEditorStyles};
export {registerDocumentSourceRootHatShape} from '@kubohiroya/turbowarp-document-source';
export {readYamlEditorFlags as readDocumentEditorFlags} from './feature-flags.js';

export function mountDocumentEditor(options) {
    const doc = options.document || globalThis.document;
    if (options.injectStyles !== false && !doc.getElementById('turbowarp-document-editor-style')) {
        const style = doc.createElement('style');
        style.id = 'turbowarp-document-editor-style';
        style.textContent = documentEditorStyles;
        doc.head.append(style);
    }
    return mountYamlEditor(options);
}
