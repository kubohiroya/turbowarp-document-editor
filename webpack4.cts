// SPDX-License-Identifier: MPL-2.0
interface WebpackRule {
 loader?: string; include?: unknown; rules?: WebpackRule[]; oneOf?: WebpackRule[];
 [key: string]: unknown;
}
interface WebpackConfig {
 module?: {rules?: WebpackRule[]; [key: string]: unknown};
 resolve?: {alias?: Record<string, string>; [key: string]: unknown};
 [key: string]: unknown;
}
import path = require('node:path');
import fs = require('node:fs');
const publicEntry = (root: string, subpath: string) => {
    const entry = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).exports[subpath];
    const relative = typeof entry === 'string' ? entry : entry?.import || entry?.default;
    if (typeof relative !== 'string') throw new Error(`Missing browser export: ${subpath}`);
    return path.resolve(root, relative);
};
// Find a package directory as Node would from `from`; yaml-json does not export its package.json.
const packageRoot = (from: string, name: string) => {
    let current = from;
    for (;;) {
        const candidate = path.join(current, 'node_modules', name);
        if (fs.existsSync(path.join(candidate, 'package.json'))) return fs.realpathSync(candidate);
        const parent = path.dirname(current);
        if (parent === current) throw new Error(`Cannot find package: ${name}`);
        current = parent;
    }
};

/** Connect package exports and modern ESM to the host's existing Babel rule. */
function withDocumentEditorWebpack4<T extends WebpackConfig>(config: T[]): T[];
function withDocumentEditorWebpack4<T extends WebpackConfig>(config: T): T;
function withDocumentEditorWebpack4(config: WebpackConfig | WebpackConfig[]): WebpackConfig | WebpackConfig[] {
    if (Array.isArray(config)) return config.map(withDocumentEditorWebpack4);
    const source = '@kubohiroya/turbowarp-document-source';
    const documents = '@kubohiroya/turbowarp-document-data';
    const yamlJson = '@kubohiroya/turbowarp-yaml-json';
    const sourceRoot = path.dirname(require.resolve(`${source}/package.json`));
    const documentsRoot = path.dirname(require.resolve(`${documents}/package.json`));
    // document-data's source integration re-exports the YAML block icon from yaml-json.
    const yamlJsonRoot = packageRoot(documentsRoot, yamlJson);
    const yamlRoot = path.dirname(require.resolve('yaml/package.json'));
    const roots = [__dirname, sourceRoot, documentsRoot, yamlJsonRoot, yamlRoot];
    const adaptRule = (rule: WebpackRule): WebpackRule => ({...rule,
        ...(rule.rules ? {rules: rule.rules.map(adaptRule)} : {}),
        ...(rule.oneOf ? {oneOf: rule.oneOf.map(adaptRule)} : {}),
        ...(typeof rule.loader === 'string' && /(?:^|[\\/])babel-loader(?:[\\/]|$)/u.test(rule.loader) && rule.include ?
            {include: [...(Array.isArray(rule.include) ? rule.include : [rule.include]), ...roots]} : {})
    });
    return {...config,
        module: {...config.module, rules: (config.module?.rules || []).map(adaptRule)},
        resolve: {...config.resolve, symlinks: true, alias: {...config.resolve?.alias,
            '@kubohiroya/turbowarp-document-editor$': path.join(__dirname, 'src/index.js'),
            [`${source}/protocol$`]: publicEntry(sourceRoot, './protocol'),
            [`${documents}/composition$`]: publicEntry(documentsRoot, './composition'),
            [`${documents}/document-source$`]: publicEntry(documentsRoot, './document-source'),
            [`${documents}/project-views$`]: publicEntry(documentsRoot, './project-views'),
            [`${yamlJson}/yaml-blocks$`]: publicEntry(yamlJsonRoot, './yaml-blocks')
        }}
    };
};
export = {withDocumentEditorWebpack4};
