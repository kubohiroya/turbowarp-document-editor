// SPDX-License-Identifier: MPL-2.0
// Moved from turbowarp-plus-editor test/document-sources.browser.ts (#27 stage A): these cases test
// this package's source-location UI with document-source, so they run here against the shipped versions.
import type {Browser, Page} from '@playwright/test';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import type {HostObject} from '../src/types.ts';
declare global {
 interface Window {fixture: HostObject;}
}
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createFixtureProject, source} from './fixtures/twpesourcefixture.ts';

const evidence = process.env.TW_SOURCE_EVIDENCE;

// A fake VM carries the fixture project; archive save, reload and stop are counted and forbidden.
const fixtureCode = `
import {mountDocumentEditor} from '../src/index.ts';
import {registerFixtureProvider, owner} from './fixtures/twpesourcefixture.ts';
const project=await (await fetch('/fixture.json')).json();
const listeners=new Map();const on=(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);};const off=(name,fn)=>listeners.get(name)?.delete(fn);
const emit=name=>[...(listeners.get(name)||[])].forEach(fn=>fn());
const targetData=project.targets[0],blockData=targetData.blocks;
const blocks={getBlock:id=>blockData[id],createBlock:block=>{blockData[block.id]=block},deleteBlock:id=>delete blockData[id],resetCache(){},_blocks:blockData};
const target={id:'stage',isStage:true,isOriginal:true,name:'Stage',getName:()=>targetData.name,blocks,comments:targetData.comments};
const calls={save:0,load:0,stop:0};
const vm={runtime:{targets:[target],extensionStorage:project.extensionStorage,on,off,emitProjectChanged(){emit('PROJECT_CHANGED')}},editingTarget:target,toJSON:()=>JSON.stringify(project),on,off,emit,stopAll(){calls.stop++},saveProjectSb3(){calls.save++;throw Error('Archive save forbidden')},loadProject(){calls.load++;throw Error('Archive reload forbidden')}};
registerFixtureProvider(vm,window.fetch.bind(window));
class FieldImage {constructor(element){this.fieldGroup_=element;this.imageElement_={};}setTooltip(){}}
const id=Object.keys(blockData).find(id=>blockData[id].opcode===owner+'_sourceDocument');
const block={id,type:blockData[id].opcode,isInFlyout:false,isShadow:()=>false,isEditable:()=>true,getFieldValue:name=>blockData[id].fields[name]?.[0],inputList:[{fieldRow:[new FieldImage(document.getElementById('hat'))]}]};
const workspace={options:{readOnly:false},getAllBlocks:()=>[block],getBlockById:other=>other===id?block:null,isDragging:()=>false,addChangeListener(){},removeChangeListener(){}};
const blockly={FieldImage,getMainWorkspace:()=>workspace,Extensions:{register(){}}};
window.Scratch={vm,gui:{getBlockly:async()=>blockly}};
window.fixture={vm,project,calls,ui:mountDocumentEditor({vm,document,documentSources:true,language:new URLSearchParams(location.search).get('lang')||'ja'})};
`;
const page$ = '<!doctype html><html lang="ja"><head><meta charset="utf-8"></head><body><h1>データソースのローカル操作検証</h1><svg width="500" height="80"><g id="hat"><rect x="10" y="10" width="300" height="60" rx="15" fill="#8a6230"/><text x="30" y="45" fill="white">データソース settings.yml</text></g></svg><script type="module" src="/fixture.js"></script></body></html>';

test('test-only owner: URL preview/cancel/save, fresh reload and embedded import are local differential transactions', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'document-source-browser-'));
    let server: Server | undefined, browser: Browser | undefined;
    try {
        const project = createFixtureProject();
        await fs.writeFile(path.join(directory, 'fixture.json'), JSON.stringify(project));
        await build({stdin: {contents: fixtureCode, resolveDir: fileURLToPath(new URL('.', import.meta.url)), sourcefile: 'document-sources-page.js', loader: 'js'},
            outfile: path.join(directory, 'fixture.js'), bundle: true, platform: 'browser', format: 'esm', logLevel: 'silent'});
        server = http.createServer(async (req, res) => {
            const url = req.url || '/';
            if (url.startsWith('/__twpe_yaml')) {res.writeHead(404); res.end('{}'); return;}
            const filename = new URL(url, 'http://localhost').pathname.slice(1);
            if (!filename) {res.setHeader('Content-Type', 'text/html'); res.end(page$); return;}
            try {
                if (filename.includes('..')) throw new Error();
                res.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'application/json');
                res.end(await fs.readFile(path.join(directory, filename)));
            } catch {res.writeHead(404); res.end();}
        });
        await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
        const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/?twPlusDocumentSource=1';
        const executablePath = process.env.TWPE_CHROME_EXECUTABLE || process.env.CHROME_PATH;
        browser = await chromium.launch({headless: true, ...(executablePath ? {executablePath} : {})});
        const page: Page = await browser.newPage({viewport: {width: 1280, height: 900}}), errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        let remote = source(20), requests = 0;
        await page.route('https://settings.example.test/**', route => {requests++; return route.fulfill({status: 200, contentType: 'text/yaml', headers: {'Access-Control-Allow-Origin': '*'}, body: remote});});
        await page.goto(url); await page.waitForFunction(() => Boolean(window.fixture));
        const initial = await page.evaluate(() => JSON.stringify(window.fixture.project));
        const projectJSON = () => page.evaluate(() => JSON.stringify(window.fixture.project));
        const saveEnabled = () => page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('.twpe-yaml-save')!.disabled);
        const open = async () => {await page.locator('#hat').click(); await page.getByRole('dialog', {name: '設定データ'}).waitFor(); await saveEnabled();};
        const location = () => page.getByLabel('参照元', {exact: true});
        const urlBox = () => page.getByRole('textbox', {name: 'HTTPS URL', exact: true});
        const loadPreview = () => page.getByRole('button', {name: '取得してプレビュー'}).click();
        const yamlText = () => page.getByRole('textbox', {name: 'YAMLテキスト', exact: true});
        const cancel = () => page.getByRole('button', {name: 'キャンセル', exact: true}).click();
        let saved: HostObject = {};

        await t.test('a URL preview shows the fetched text without changing the project, and Cancel keeps it unchanged', async () => {
            await open();
            assert.equal(await page.getByRole('tab').count(), 2);
            await location().selectOption('url');
            await urlBox().fill('https://settings.example.test/settings.yml');
            assert.equal(await page.locator('.twpe-yaml-save').isDisabled(), true);
            await loadPreview();
            await saveEnabled();
            assert.equal(await yamlText().inputValue(), remote);
            assert.equal(await projectJSON(), initial);
            await cancel();
            assert.equal(await projectJSON(), initial);
        });

        await t.test('Save reuses the exact validated preview and records the URL location', async () => {
            await open();
            await location().selectOption('url');
            await urlBox().fill('https://settings.example.test/settings.yml');
            await loadPreview();
            await saveEnabled();
            const beforeSaveRequests = requests;
            await page.locator('.twpe-yaml-save').click();
            await page.getByRole('dialog').waitFor({state: 'hidden'});
            assert.equal(requests, beforeSaveRequests, 'Save must reuse its exact fetched and validated preview');
            assert.equal(await page.evaluate(() => Object.values<{url: string}>(window.fixture.project.extensionStorage.twpesourcefixture.documentSourceLocations.urls)[0].url), 'https://settings.example.test/settings.yml');
        });

        await t.test('reopening a URL source fetches it fresh and keeps blocks and external editing disabled', async () => {
            remote = source(30);
            await open();
            assert.equal(await yamlText().inputValue(), remote);
            assert.equal(await page.getByRole('tab', {name: 'YAMLブロック', exact: true}).isDisabled(), true);
            assert.equal(await page.getByRole('button', {name: '外部エディタで編集'}).isDisabled(), true);
            if (evidence) {await fs.mkdir(evidence, {recursive: true}); await page.screenshot({path: path.join(evidence, 'url-source-preview.png')});}
        });

        await t.test('importing into the SB3 file removes the URL location and changes only the owner document', async () => {
            await location().selectOption('embedded-file');
            await loadPreview();
            await saveEnabled();
            await page.locator('.twpe-yaml-save').click(); await page.getByRole('dialog').waitFor({state: 'hidden'});
            saved = await page.evaluate(() => ({project: window.fixture.project, calls: window.fixture.calls}));
            assert.equal(saved.project.extensionStorage.twpesourcefixture.documentSourceLocations, undefined);
            assert.equal(saved.project.extensionStorage.twpesourcefixture.documents.settings, remote);
            assert.deepEqual(saved.project.extensionStorage.unrelated, {keep: 'unchanged'});
            assert.deepEqual(saved.project.targets, project.targets);
            await open(); assert.equal(await page.getByRole('tab', {name: 'YAMLブロック', exact: true}).isEnabled(), true);
        });

        await t.test('an invalid URL source shows an error, keeps Save disabled and leaves the project unchanged', async () => {
            await location().selectOption('url');
            await urlBox().fill('https://settings.example.test/invalid.yml'); remote = 'not settings';
            const beforeInvalid = await projectJSON();
            await loadPreview(); await page.locator('.twpe-yaml-error').filter({hasText: /./}).waitFor();
            assert.equal(await page.locator('.twpe-yaml-save').isDisabled(), true);
            assert.equal(await projectJSON(), beforeInvalid);
            await cancel();
        });

        await t.test('no archive save, project reload or stop happened and the page raised no errors', async () => {
            assert.deepEqual(saved.calls, {save: 0, load: 0, stop: 0});
            assert.deepEqual(await page.evaluate(() => window.fixture.calls), {save: 0, load: 0, stop: 0});
            assert.deepEqual(errors, []);
        });
        if (evidence) await fs.writeFile(path.join(evidence, 'browser-result.json'), JSON.stringify({passed: true, requests, errors, calls: saved.calls, originalProjectRetainedOnCancel: true, saveReusedPreview: true, urlReplacedWithEmbeddedFile: true}, null, 2));
        await page.close();
    } finally {
        await browser?.close();
        await new Promise<void>(resolve => server ? server.close(() => resolve()) : resolve());
        await fs.rm(directory, {recursive: true, force: true});
    }
});
