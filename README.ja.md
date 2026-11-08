# turbowarp-document-editor

[English](README.md)

TurboWarpのデータソースを編集する共通UIと、ローカル外部エディタ連携を提供します。

## 依存の方向

- `turbowarp-document-source`：SB3内ファイル・HTTPS参照・共通ブロック・スキーマ専用ブロックの参照契約と更新候補を扱います。
- `turbowarp-document-editor`：ダイアログ、非同期タブプレビュー、形式変換の確認、検証と保存、外部エディタ連携を提供します。
- `scratch-gui`フォーク：共通UIをマウントし、VM・Blockly・言語・起動時フラグを渡します。
- `turbowarp-plus-editor`：固定したGUIをビルドしてGitHub Pagesで配信します。編集UIを追加注入しません。

本パッケージはGUI・配信サイト・紙芝居Appに依存しません。スキーマ・ガイドURL・表示名・台本変換・実行時の解釈は、文書を所有する機能拡張が登録します。紙芝居Appの場合は「紙芝居台本データ」、それ以外では汎用の「データソース」を表示できます。

## GUIへの組み込み

```js
import {mountDocumentEditor,
    registerDocumentSourceRootHatShape} from '@kubohiroya/turbowarp-document-editor';

registerDocumentSourceRootHatShape(Blockly);
const editor = mountDocumentEditor({
    vm,
    document,
    language: 'ja',
    getScratch: () => ({vm, gui: {getBlockly: async () => Blockly}})
});
// Dispose when the host is unmounted or its VM is replaced.
// editor.dispose();
```

起動時のスイッチはありません。何が出るかは登録された提供元が決めます。提供元が所有する文書のハットにファイルのアイコンが付き、提供元が参照元を変更できるとした文書では参照元（SB3内のファイル・外部URL）の操作が出ます。そのような提供元のない作品は、本家のTurboWarpと同じ見た目です。

スタイルはマウント時に一度挿入します。ホストがCSSを別途読み込む場合は `injectStyles: false` と `@kubohiroya/turbowarp-document-editor/style.css` を使用できます。配色はGUIのテーマが与えるカスタムプロパティ（`--ui-modal-background`、`--ui-modal-foreground`、`--ui-black-transparent`、`--input-background`、`--ui-secondary`、`--link-color`、`--looks-secondary`）を参照し、light・dark・autoに追従します。これらを設定しないホストでは、フォールバックとして従来のライト配色で表示します。Webpack 4では `@kubohiroya/turbowarp-document-editor/webpack4` の `withDocumentEditorWebpack4(config)` でサブパスの解決とホストのBabel対象を追加します。

### YAML プレビューの位置指定

`editor.getSearchableYamlDocuments()` は、作品のハットが参照する利用可能な SB3 内 YAML ファイルを、文書参照・ファイル名・本文とともに返します。本文の改行は LF に統一します。`editor.openYamlPreview(reference, {start, end, expectedText})` は対象文書を開き、UTF-16 の半開区間 `[start, end)` を選択して表示します。戻り値は要求を受け付けたかを示し、実際の選択はプレビューの読み込み後に行います。`expectedText` を指定した場合は、範囲の本文が一致するときだけ選択します。

`editor.stageYamlReplacement(reference, range, source, text)` は、検索時の本文と一致範囲を照合して置換をプレビューに下書きします。`source` には検索時に取得した LF 改行の本文を渡します。ユーザーが保存すると、文書提供元が検証して作品に反映します。

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

## TypeScriptでの開発

本体・Node連携・Webpackアダプター・テストをTypeScriptで管理します。`npm run typecheck`はstrict設定で検証し、`npm run build`は`dist/`にJavaScript・型宣言・スタイルを生成します。GUIは生成済みJavaScriptを参照し、TypeScriptローダーは不要です。Git依存のインストール時もprepareでビルドします。

## ライセンス

MPL-2.0。[LICENSE](LICENSE)、[NOTICE](NOTICE)、[コード由来の確認記録](docs/license-provenance.md)を参照してください。GUI配布物のライセンス条件と依存パッケージの通知は引き続き維持します。
