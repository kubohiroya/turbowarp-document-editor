import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../src/ui.css', import.meta.url), new URL('../dist/src/ui.css', import.meta.url));
