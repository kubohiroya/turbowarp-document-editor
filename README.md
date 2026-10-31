# turbowarp-document-editor

Reusable document editing UI and a local external-editor companion for TurboWarp GUI hosts.

[日本語](README.ja.md)

## Architecture

| Package | Responsibility |
| --- | --- |
| `turbowarp-document-source` | References and update candidates for SB3 files, HTTPS sources, YAML blocks, and schema-specific blocks |
| `turbowarp-document-editor` | Document dialog, asynchronous previews, conversion confirmation, validation/save actions, and external editing |
| scratch-gui fork | Mounts the UI and supplies the VM, Blockly, language, and startup flags |
| `turbowarp-plus-editor` | Pins, builds, and distributes the GUI |

This package does not depend on the GUI, distribution site, or Kamishibai App. A document owner registers its schema, guide URL, localized title, conversions, validation, and project updates. For example, the Kamishibai owner supplies “Kamishibai script data”; other owners can use the neutral “Data source” title.

## Host integration

```ts
import {
  mountDocumentEditor,
  readDocumentEditorFlags,
  registerDocumentSourceRootHatShape
} from '@kubohiroya/turbowarp-document-editor';

// Resolve once at host startup. Both flags are disabled by default.
const flags = readDocumentEditorFlags(location.search);
registerDocumentSourceRootHatShape(Blockly);
const editor = flags.embeddedYamlEditor ? mountDocumentEditor({
  vm,
  document,
  language: 'en',
  documentSources: flags.documentSources,
  getScratch: () => ({vm, gui: {getBlockly: async () => Blockly}})
}) : null;

// Dispose when the host unmounts or replaces its VM.
editor?.dispose();
```

`twPlusYamlEditor=1` enables editing; `twPlusDocumentSource=1` enables source-location changes. The host resolves these flags once; project data cannot enable them. Register the disconnected root-hat shape even when editing is disabled.

The package inserts its stylesheet once when mounted. Hosts that load CSS themselves can use `injectStyles: false` and `@kubohiroya/turbowarp-document-editor/style.css`.

For Webpack 4, wrap the host configuration with `withDocumentEditorWebpack4` from `@kubohiroya/turbowarp-document-editor/webpack4`. The adapter resolves package subpaths and includes the compiled ESM in the host's existing Babel rule. GUI hosts consume generated JavaScript and declaration files; they do not need a TypeScript loader.

## Save and conversion behavior

Tab previews run asynchronously and discard obsolete responses. Save reuses the exact candidate produced for the current preview. Cancel and close leave the VM unchanged.

Save delegates validation and differential updates to the document owner. It updates the affected document metadata and blocks without compressing/reloading the entire SB3 or stopping the project. Downloading an SB3 remains the GUI's standard file operation.

An HTTPS source is fetched for preview. Save reuses the validated fetched candidate; importing that source into the SB3 also uses the owner's candidate and commit protocol.

## External editing

```sh
npx @kubohiroya/turbowarp-document-editor --site-dir /absolute/path/to/built-gui
```

The companion opens `/editor.html` by default. Distributions can inject `publicPath` and `editorPath` through `startDocumentEditorHost`. External edits are not applied to the project until the dialog's Save action.

The host listens only on `127.0.0.1` and checks Origin, Host, and session tokens. It passes only private session files to VSCode and isolates each document's JSON Schema settings. Existing protocol names are retained for compatibility.

## TypeScript development

All maintained application, companion, integration-adapter, and test code is TypeScript. Build output is generated under `dist/`; ESM browser/Node entries, the CommonJS Webpack adapter, declaration files, and the stylesheet are included in the package.

```sh
npm ci
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run pack:check
```

Tests cover previews, differential commits, the companion host, Japanese/English layouts, narrow screens, window controls, cancellation, and asynchronous races. They stub native VSCode launch; they do not launch the desktop editor.

To roll back, disable the host's startup flags and reload, or restore the previous pinned package SHA. Existing SB3 documents and external working files remain intact.

## License

MPL-2.0. See [LICENSE](LICENSE), [NOTICE](NOTICE), and the [source provenance review](docs/license-provenance.md). The GUI distribution retains its own license obligations; dependency notices must be preserved.
