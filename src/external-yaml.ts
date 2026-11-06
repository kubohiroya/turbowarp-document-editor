// SPDX-License-Identifier: MPL-2.0
import {createSourceDocumentRegistry} from '@kubohiroya/turbowarp-document-data/composition';
import {mountYamlEditor} from './client.ts';
import type {DocumentPanelRequest, HostObject} from './types.ts';

type FileRevision = {source: string; revision: string};
type OpenedFile = FileRevision & {id: string; name: string};

export interface ExternalYamlFilePort {
    open(): Promise<OpenedFile | null>;
    save(id: string, revision: string, source: string): Promise<FileRevision>;
    close(id: string): Promise<void>;
}

export function createExternalYamlMenuAction({vm, port, locale, openPanel, document: doc}: {
    vm: HostObject;
    port: ExternalYamlFilePort;
    locale: string;
    openPanel(request: DocumentPanelRequest): boolean;
    document: Document;
}) {
    const japanese = /^ja(?:-|$)/i.test(locale);
    const panels = new Map<string, DocumentPanelRequest>();
    const showError = (message: string) => {
        const dialog = doc.createElement('dialog');
        dialog.className = 'twpe-yaml-dialog twpe-yaml-confirmation';
        dialog.setAttribute('role', 'alertdialog');
        dialog.setAttribute('aria-label', japanese ? '外部YAMLファイル' : 'External YAML file');
        const detail = doc.createElement('p');
        detail.textContent = message;
        const dismiss = doc.createElement('button');
        dismiss.type = 'button';
        dismiss.textContent = 'OK';
        dismiss.onclick = () => dialog.close();
        dialog.append(detail, dismiss);
        dialog.addEventListener('close', () => dialog.remove(), {once: true});
        doc.body.append(dialog);
        dialog.showModal();
    };
    let nextDocument = 0;
    const open = async () => {
        let file: OpenedFile | null = null;
        let owned = false;
        try {
            file = await port.open();
            if (!file) return;
            const {id, name} = file;
            const existing = panels.get(id);
            if (existing) {
                openPanel(existing);
                return;
            }
            owned = true;
            let current: FileRevision = file;
            const reference = {providerId: 'file', documentId: String(++nextDocument)};
            const release = () => {
                panels.delete(id);
                return port.close(id);
            };
            const request: DocumentPanelRequest = {
                reference,
                filename: name,
                mount(element, close) {
                    const registry = createSourceDocumentRegistry();
                    registry.register({
                        id: reference.providerId,
                        list: () => [{documentId: reference.documentId, filename: name, format: 'yaml'}],
                        open: () => ({
                            inspect: () => ({available: true}),
                            capture: () => ({source: current.source, sourceName: name}),
                            async prepare(_snapshot, source) {
                                const {parseAllDocuments} = await import('yaml');
                                const errors = parseAllDocuments(source).flatMap(document => document.errors);
                                if (errors.length) throw errors[0];
                                return {source};
                            },
                            async commit(snapshot, {source}) {
                                if (snapshot.source !== current.source) throw new Error('The YAML draft is out of date.');
                                if (current.source.startsWith('\uFEFF') && !source.startsWith('\uFEFF')) source = '\uFEFF' + source;
                                if (current.source.includes('\r\n') && !current.source.replace(/\r\n/g, '').includes('\n')) {
                                    source = source.replace(/\r?\n/g, '\r\n');
                                }
                                current = await port.save(id, current.revision, source);
                                return current;
                            },
                            dispose() {}
                        })
                    });
                    const editor = mountYamlEditor({vm, document: element.ownerDocument, language: locale, registry},
                        {element, close, externalFile: true});
                    void editor.open(reference);
                    return {
                        requestClose: editor.requestClose,
                        dispose() {
                            editor.dispose();
                            registry.dispose();
                            void release().catch(error => showError(String(error)));
                        }
                    };
                }
            };
            panels.set(id, request);
            if (!openPanel(request)) {
                await release();
                throw new Error(japanese ? 'ファイルを開くにはDockviewを有効にしてください。' : 'Enable Dockview to open a YAML file.');
            }
        } catch (error) {
            if (owned && file && panels.has(file.id)) {
                panels.delete(file.id);
                await port.close(file.id).catch(() => {});
            }
            showError(error instanceof Error ? error.message : String(error));
        }
    };
    return {label: japanese ? '外部YAMLファイルを開く…' : 'Open external YAML file…', open};
}
