// SPDX-License-Identifier: MPL-2.0
import type {
  RegisteredSourceDocumentMetadata, SourceDocumentAdapter, SourceDocumentReference,
  SourceDocumentRegistry, SourceDocumentSnapshot, SourceDocumentRepresentationRequest
} from '@kubohiroya/turbowarp-document-data/composition';
import type {DocumentSource, DocumentSourceAdapter} from '@kubohiroya/turbowarp-document-source';

// VM and Blockly are host-owned APIs without a dependency on a particular GUI implementation.
// Their dynamic objects are checked at the integration boundary before use.
export type HostObject = Record<string, any>;
export type DocumentReference = SourceDocumentReference;
export type DocumentSnapshot = SourceDocumentSnapshot;
export type DocumentAdapter = SourceDocumentAdapter & Partial<Pick<DocumentSourceAdapter,
  'loadSource' | 'prepareDataSource' | 'commitDataSource'>>;
export type DocumentEntry = RegisteredSourceDocumentMetadata & {
  readonly dataSource?: DocumentSource;
  readonly sourceLocationEditable?: boolean;
  readonly dialogTitle?: Readonly<Record<string, string>>;
};
export interface DocumentRegistry extends Omit<SourceDocumentRegistry, 'open' | 'list'> {
  open(reference: DocumentReference | string): DocumentAdapter;
  list(): readonly DocumentEntry[];
}
export interface ScratchHost {
  vm: HostObject;
  gui: {getBlockly(): HostObject | Promise<HostObject>; getBlocklyEagerly?(): HostObject | null | Promise<HostObject | null>};
}
export type HostWindow = Window & typeof globalThis & {Scratch?: ScratchHost; ScratchBlocks?: HostObject};
export interface DocumentEditorOptions {
  vm: HostObject;
  document?: Document;
  getScratch?: () => ScratchHost | undefined;
  registry?: DocumentRegistry;
  readReference?: (block: HostObject, target?: HostObject) => DocumentReference;
  fetch?: typeof fetch;
  language?: string;
  documentSources?: boolean;
  injectStyles?: boolean;
}
export interface PreviewAttempt {owner: DocumentAdapter; snapshot: DocumentSnapshot; kind: string; source?: string;}
export interface RepresentationOption {label: string; available: boolean; reason?: string; request: SourceDocumentRepresentationRequest | null;}
export interface ExternalSession {id: string; revision: number; format?: string;}
export interface CompanionConfig {available: boolean; token?: string; maxSourceBytes?: number;}
export interface Disposable {dispose(): void;}

export interface PreviewReady extends PreviewAttempt {source: string;}
