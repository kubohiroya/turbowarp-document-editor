// SPDX-License-Identifier: MPL-2.0
import type {DocumentEntry, DocumentReference, DocumentRegistry, HostObject, SearchableYamlDocument, YamlPreviewRange} from './types.ts';

export const documentKey = ({providerId, documentId}: DocumentReference) => JSON.stringify([providerId, documentId]);

export function isYaml(entry: DocumentEntry | undefined): entry is DocumentEntry {
    return Boolean(entry && (entry.format === 'yaml' || (!entry.format && /\.ya?ml$/i.test(entry.filename))));
}

export function readSearchableYamlDocuments(vm: HostObject, registry: DocumentRegistry,
    readReference: (block: HostObject, target?: HostObject) => DocumentReference): SearchableYamlDocument[] {
    const opcodes = new Set(registry.getHatOpcodes());
    if (!opcodes.size) return [];
    const references = new Set<string>();
    for (const target of vm.runtime?.targets ?? []) {
        if (target.isOriginal === false) continue;
        for (const id of target.blocks?.getScripts?.() ?? []) {
            const block = target.blocks.getBlock(id);
            if (!block || !opcodes.has(block.opcode)) continue;
            try {
                references.add(documentKey(readReference(block, target)));
            } catch {
                // An unresolved hat has no source to search.
            }
        }
    }
    return registry.list().flatMap(entry => {
        if (!isYaml(entry) || entry.available === false || entry.dataSource?.kind === 'url' ||
            (entry.activeRepresentation && entry.activeRepresentation !== 'source') ||
            !references.has(documentKey(entry.reference))) return [];
        try {
            const adapter = registry.open(entry.reference);
            try {
                if (!adapter.inspect().available) return [];
                const {source} = adapter.capture();
                return [{reference: entry.reference, filename: entry.filename, source: source.replace(/\r\n?/g, '\n')}];
            } finally {
                adapter.dispose();
            }
        } catch {
            return [];
        }
    });
}

export function selectYamlPreviewRange(preview: HTMLTextAreaElement, range: YamlPreviewRange) {
    const {start, end, expectedText} = range;
    const value = preview.value;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > value.length ||
        (expectedText !== undefined && value.slice(start, end) !== expectedText)) return false;
    const doc = preview.ownerDocument;
    const styles = doc.defaultView!.getComputedStyle(preview);
    const mirror = doc.createElement('div');
    Object.assign(mirror.style, {
        position: 'fixed', top: '0', left: '-10000px', visibility: 'hidden',
        boxSizing: 'border-box', width: `${preview.clientWidth}px`,
        font: styles.font, lineHeight: styles.lineHeight, padding: styles.padding,
        whiteSpace: styles.whiteSpace, overflowWrap: styles.overflowWrap, tabSize: styles.tabSize
    });
    const marker = doc.createElement('span');
    marker.textContent = value.slice(start, end);
    mirror.append(value.slice(0, start), marker, value.slice(end));
    doc.body.append(mirror);
    const {offsetTop, offsetLeft} = marker;
    mirror.remove();
    preview.focus({preventScroll: true});
    preview.setSelectionRange(start, end);
    preview.scrollTop = Math.max(0, offsetTop - preview.clientHeight / 2);
    preview.scrollLeft = Math.max(0, offsetLeft - preview.clientWidth / 2);
    return true;
}
