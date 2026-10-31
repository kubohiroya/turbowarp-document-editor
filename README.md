# turbowarp-document-editor

TurboWarpのデータソースを編集する共通UIと、ローカル外部エディタ連携を提供します。

## 依存の方向

- `turbowarp-document-source`：SB3内ファイル・HTTPS参照・共通ブロック・スキーマ専用ブロックの参照契約と更新候補を扱います。
- `turbowarp-document-editor`：ダイアログ、非同期タブプレビュー、形式変換の確認、検証と保存、外部エディタ連携を提供します。
- `scratch-gui`フォーク：共通UIをマウントし、VM・Blockly・言語・起動時フラグを渡します。
- `turbowarp-plus-editor`：固定したGUIをビルドしてGitHub Pagesで配信します。編集UIを追加注入しません。

本パッケージはGUI・配信サイト・紙芝居Appに依存しません。スキーマ・ガイドURL・表示名・台本変換・実行時の解釈は、文書を所有する機能拡張が登録します。紙芝居Appの場合は「紙芝居台本データ」、それ以外では汎用の「データソース」を表示できます。

## GUIへの組み込み

```js
import {mountDocumentEditor, readDocumentEditorFlags,
    registerDocumentSourceRootHatShape} from '@kubohiroya/turbowarp-document-editor';

// Read once during startup. Both flags are off by default.
const flags = readDocumentEditorFlags(location.search);
registerDocumentSourceRootHatShape(Blockly);
const editor = flags.embeddedYamlEditor ? mountDocumentEditor({
    vm,
    document,
    language: 'ja',
    documentSources: flags.documentSources,
    getScratch: () => ({vm, gui: {getBlockly: async () => Blockly}})
}) : null;
// Dispose when the host is unmounted or its VM is replaced.
// editor?.dispose();
```

`twPlusYamlEditor=1`で編集UIを、`twPlusDocumentSource=1`で参照元変更を有効にします。GUIは起動時に固定し、SB3から有効化しません。ルートハットの接続不可の形はフラグOFFでも登録します。

スタイルはマウント時に一度挿入します。ホストがCSSを別途読み込む場合は `injectStyles: false` と `@kubohiroya/turbowarp-document-editor/style.css` を使用できます。Webpack 4では `@kubohiroya/turbowarp-document-editor/webpack4` の `withDocumentEditorWebpack4(config)` でサブパスの解決とホストのBabel対象を追加します。

## 保存と変換

タブ切替は非同期で、古い応答を破棄します。同一セッションのプレビュー候補を保存時にも使います。キャンセル・閉じるではVMを変更しません。保存は所有者の検証と差分適用を呼び出し、関係するブロック・文書メタデータだけを更新します。SB3全体の圧縮・再読込・作品の停止はしません。

HTTPS文書はプレビュー時に取得し、保存時は検証した候補を再利用します。URL参照をSB3内ファイルへ取り込む操作も所有者の候補処理を通ります。

## 外部エディタ連携

```sh
npx @kubohiroya/turbowarp-document-editor --site-dir /absolute/path/to/built-gui
```

標準では `/editor.html` を開きます。配信サイトは `startDocumentEditorHost` に `publicPath` と `editorPath` を渡せます。ブラウザでの変更は保存を押すまで作品に反映しません。

連携ホストは127.0.0.1に限定し、Origin・Host・セッショントークンを検査します。専用ディレクトリ内の文書だけをVSCodeへ渡し、JSON Schema設定もセッションごとに分離します。既存の連携プロトコル名は互換性のため維持しています。

## 検証・切戻し

`npm test` は変換プレビュー・差分適用・外部編集ホストを検証します。`npm run test:browser` は日英・狭幅・ウィンドウ操作・非同期競合・保存・キャンセルをChromeで検証します。ネイティブVSCodeの起動テストは含みません。

切戻しは起動フラグをOFFにして再読込するか、GUI側の固定依存SHAを戻します。フラグOFFでも文書・ハットのデータは保持します。

## ライセンス

GPL-3.0-or-later。TurboWarp-Plus-Editorから抽出した実装のライセンスを継承しています。依存パッケージの通知は配信ホストでも保持してください。
