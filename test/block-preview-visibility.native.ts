// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import type {HostObject, HostWindow} from '../src/types.ts';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

test('native preview stays invisible until layout completes and cancelled renders stay hidden',
    {timeout: 120000}, async t => {
        const scratchBlocks = process.env.TWPE_TEST_SCRATCH_BLOCKS;
        assert(scratchBlocks && path.isAbsolute(scratchBlocks),
            'Set TWPE_TEST_SCRATCH_BLOCKS to the pinned TurboWarp/scratch-blocks browser distribution.');
        const directory = await mkdtemp(path.join(tmpdir(), 'twpe-preview-'));
        t.after(() => rm(directory, {recursive: true, force: true}));
        await build({
            entryPoints: ['src/block-preview.ts'],
            outfile: path.join(directory, 'preview.mjs'),
            bundle: true, platform: 'browser', format: 'esm'
        });
        await writeFile(path.join(directory, 'index.html'), `<!doctype html>
            <meta charset="utf-8">
            <div id="main" style="position:absolute;inset:0"></div>
            <script src="/blockly_compressed_vertical.js"></script>
            <script src="/blocks_compressed_vertical.js"></script>
            <script src="/msg/scratch_msgs.js"></script>
            <script>
                Blockly.ScratchMsgs.setLocale('en');
                Blockly.inject(document.querySelector('#main'), {readOnly: true, sounds: false});
            </script>`);
        const assets = new Map([
            ['/index.html', [directory, 'text/html']],
            ['/preview.mjs', [directory, 'text/javascript']],
            ['/blockly_compressed_vertical.js', [scratchBlocks, 'text/javascript']],
            ['/blocks_compressed_vertical.js', [scratchBlocks, 'text/javascript']],
            ['/msg/scratch_msgs.js', [scratchBlocks, 'text/javascript']]
        ]);
        const server = createServer(async (request, response) => {
            const name = request.url || '';
            const asset = assets.get(name);
            if (!asset) { response.writeHead(404).end(); return; }
            try {
                response.setHeader('content-type', asset[1]);
                response.end(await readFile(path.join(asset[0], name.slice(1))));
            } catch {
                response.writeHead(500).end();
            }
        });
        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', resolve);
        });
        t.after(() => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())));
        const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
        const browser = await chromium.launch({
            headless: true,
            ...(process.env.TWPE_CHROME_EXECUTABLE ?
                {executablePath: process.env.TWPE_CHROME_EXECUTABLE} : {})
        });
        const page = await browser.newPage({viewport: {width: 1280, height: 900}});
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
            await page.goto(base + 'index.html');
            const result = await page.evaluate(async base => {
                const {renderBlockPreview} = await import(base + 'preview.mjs');
                const B = (window as HostWindow & {Blockly: HostObject}).Blockly, main = B.getMainWorkspace();
                const originalDefinitions = Object.keys(B.Blocks).sort();
                const container = document.createElement('div');
                container.style.cssText = 'position:fixed;inset:90px 20px 20px;z-index:99999;';
                document.body.append(container);
                const ids = Array.from({length: 96}, (_, index) => 'previewRow' + index);
                const model = {
                    source: 'A large native preview', rootIds: ids,
                    blockDefinitions: [{opcode: 'fixture_text', text: 'native preview', blockType: 'reporter'}],
                    blocks: Object.fromEntries(ids.map(id => [id, {
                        opcode: 'fixture_text', fields: {}, inputs: {}, next: null
                    }]))
                };
                const visible = (element: HTMLElement) => {
                    const css = getComputedStyle(element);
                    return css.visibility === 'visible' && css.display !== 'none' &&
                        element.getBoundingClientRect().width > 0;
                };
                async function render(cancel: boolean) {
                    const controller = new AbortController();
                    const frames: {visible: boolean; svgBlocks: number}[] = [];
                    let active = true, frame: number;
                    const inspect = () => {
                        const surface = container.querySelector<HTMLElement>('[data-twpe-block-preview]');
                        if (surface) {
                            frames.push({
                                visible: visible(surface),
                                svgBlocks: surface.querySelectorAll('.blocklyBlockCanvas > g').length
                            });
                            if (cancel) controller.abort();
                        }
                        if (active) frame = requestAnimationFrame(inspect);
                    };
                    frame = requestAnimationFrame(inspect);
                    try {
                        const handle = await renderBlockPreview({
                            container, model, getScratch: () => ({gui: {getBlockly: async () => B}}),
                            vm: {}, signal: controller.signal
                        });
                        const surface = container.querySelector<HTMLElement>('[data-twpe-block-preview]');
                        if (!surface) throw new Error('The completed preview surface is absent.');
                        const workspace = B.Workspace.getById(surface.dataset.workspaceId);
                        const roots = (workspace.getTopBlocks(false) as HostObject[]).map(block => {
                            const xy = block.getRelativeToSurfaceXY();
                            return {x: xy.x, y: xy.y, height: block.getHeightWidth().height};
                        }).sort((a, b) => a.y - b.y);
                        const ready = visible(surface);
                        handle.dispose();
                        return {frames, ready, roots};
                    } catch (error) {
                        if (!cancel || !(error instanceof Error) || error.name !== 'AbortError') throw error;
                        return {frames, cancelled: true as const, remaining: container.childElementCount};
                    } finally {
                        active = false;
                        cancelAnimationFrame(frame);
                    }
                }
                try {
                    const complete = await render(false);
                    const cancelled = await render(true);
                    return {
                        complete, cancelled, mainUnchanged: B.getMainWorkspace() === main,
                        definitionsUnchanged: JSON.stringify(Object.keys(B.Blocks).sort()) ===
                            JSON.stringify(originalDefinitions)
                    };
                } finally {container.remove();}
            }, base);
            assert('roots' in result.complete && result.complete.roots);
            assert(result.complete.frames.length > 0, 'Exercise real browser frames during chunked rendering.');
            assert.deepEqual(result.complete.frames.filter(frame => frame.visible), [],
                'Unfinished blocks must never appear in a painted frame.');
            assert(result.complete.ready, 'Show the completed workspace.');
            assert.equal(result.complete.roots.length, 96);
            for (let index = 1; index < result.complete.roots.length; index++) {
                const previous = result.complete.roots[index - 1], current = result.complete.roots[index];
                assert(current.y >= previous.y + previous.height, 'Completed roots must not overlap.');
            }
            assert('cancelled' in result.cancelled && result.cancelled.cancelled);
            assert(result.cancelled.frames.length > 0);
            assert.deepEqual(result.cancelled.frames.filter(frame => frame.visible), []);
            assert.equal(result.cancelled.remaining, 0);
            assert(result.mainUnchanged);
            assert(result.definitionsUnchanged);
            assert.deepEqual(errors, []);
        } finally {
            await browser.close();
        }
    });
