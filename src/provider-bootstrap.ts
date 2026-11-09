// SPDX-License-Identifier: MPL-2.0
import type {HostObject} from './types.ts';
import {readReference, type DocumentSourceVM} from '@kubohiroya/turbowarp-document-source';
import {getDocumentSourceRegistry} from '@kubohiroya/turbowarp-document-data/document-source';

// The host and runtime owners use the same canonical, VM-local document registry.
export function getYamlEditorProviders(vm: HostObject) {
    return Object.freeze({registry: getDocumentSourceRegistry(vm as DocumentSourceVM), readReference});
}
