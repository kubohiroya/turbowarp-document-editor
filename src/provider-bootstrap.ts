import type {HostObject} from './types.ts';
import {readReference, getDocumentSourceRegistry} from '@kubohiroya/turbowarp-document-source';

// The host and runtime owners use the same canonical, VM-local document registry.
export function getYamlEditorProviders(vm: HostObject) {
    return Object.freeze({registry: getDocumentSourceRegistry(vm), readReference});
}
