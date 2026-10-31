import type {HostObject, DocumentReference, DocumentRegistry, DocumentAdapter} from './types.ts';
import {getSourceDocumentRegistry} from '@kubohiroya/turbowarp-document-data/composition';

// The document owner supplies validation and commits; the Editor only selects its reference.
export function createEmbeddedYamlDocument(vm: HostObject, reference: DocumentReference, registry: DocumentRegistry = getSourceDocumentRegistry(vm)): DocumentAdapter {
    return registry.open(reference);
}
