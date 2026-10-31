# Source provenance and license review

Review date: 2026-11-01. Package license: MPL-2.0.

## Scope and result

The maintained document editor sources, their original public history, runtime imports,
and reachable browser-bundle inputs were reviewed. No third-party GPL/AGPL implementation
was found in this package. This conclusion concerns the package implementation, not the
GPL host distribution that uses it.

The code was developed for the document-editing feature in the author's
TurboWarp-Plus-Editor repository. The original source history identifies Hiroya Kubo
as its author. Its earlier GPL-3.0-or-later package label came from the distribution
package. The copyright holder explicitly authorized MPL-2.0 distribution of this
independent implementation. Earlier GPL grants are not revoked.

## Original public source history

| Current source | Original path | Creation commit |
| --- | --- | --- |
| `src/block-preview.ts` | `site/yaml-editor/block-preview.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/client.ts` | `site/yaml-editor/client.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/dialog-window.ts` | `site/yaml-editor/dialog-window.js` | [95bb215cdc](https://github.com/kubohiroya/turbowarp-plus-editor/commit/95bb215cdcfd5b9d35fb4f23b886df384773c5f5) |
| `src/document.ts` | `site/yaml-editor/document.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/feature-flags.ts` | `site/yaml-editor/feature-flags.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/focus-document.ts` | `site/yaml-editor/focus-document.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/hat-entry.ts` | `site/yaml-editor/hat-entry.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/provider-bootstrap.ts` | `site/yaml-editor/provider-bootstrap.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/root-shape.ts` | `site/yaml-editor/root-shape-bootstrap.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `src/workspace-patch.ts` | `site/yaml-editor/workspace-patch.js` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `node/cli.ts` | `scripts/yaml-editor/cli.mjs` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `node/host.ts` | `scripts/yaml-editor/host.mjs` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `node/schema.ts` | `scripts/yaml-editor/schema.mjs` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |
| `node/vscode.ts` | `scripts/yaml-editor/vscode.mjs` | [2ceb7d4f66](https://github.com/kubohiroya/turbowarp-plus-editor/commit/2ceb7d4f66456220e84416eb54042a31d68d835d) |

The TypeScript contracts, CSS-copy script and Webpack adapter were developed in this
package. Tests are maintained with the same package license. `styles.ts` contains the
package's own stylesheet as a generated string; it is not copied GUI styling.

## Host and dependency boundary

- The caller supplies VM, Blockly and DOM references. This package does not import or
  ship scratch-gui, scratch-vm or scratch-blocks implementations.
- The reachable browser bundle contained 20 contributing input modules and no
  Scratch host implementation. The data/model inputs come from document-source and
  document-data (MPL-2.0).
- The external icon-binding API is the owner's independently developed
  `turbowarp-extension-data-editor` adapter (`src/turbowarp/icon.js`, originally
  [90d53b68b6](https://github.com/kubohiroya/turbowarp-extension-data-editor/commit/90d53b68b6f7def6246e74ada9aa3a6652901b10)).
  Its npm 0.7.0 manifest does not declare a package-level license; this change does
  not assign a new license to that dependency. No GPL host implementation is
  incorporated by the used adapter.
- Node built-in APIs are referenced, not bundled. VSCode and its YAML extension
  are launched/installed externally and are not distributed in this package.
- Dependency notices and the host's distribution obligations remain separate and
  must be retained. This package's MPL change does not relicense dependencies.

## Additional comparison

The original implementation was compared with 1,047 files from local GUI,
ScratchBlocks and VM source trees. There were no matches of ten consecutive
normalized substantive lines totaling at least 240 characters. This is a
supplementary copying check, not a substitute for the source-history and import
review. No GPL/AGPL notice was present in the 28 maintained implementation/test/
adapter/stylesheet files reviewed.

See [LICENSE](../LICENSE) and [NOTICE](../NOTICE). MPL/GPL integration conditions
are described in [Mozilla's developer guidelines](https://www.mozilla.org/en-US/MPL/2.0/combining-mpl-and-gpl/).
