const path = require('node:path');
const fs = require('node:fs');
const publicEntry = (root, subpath) => {
    const entry = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).exports[subpath];
    const relative = typeof entry === 'string' ? entry : entry?.import || entry?.default;
    if (typeof relative !== 'string') throw new Error(`Missing browser export: ${subpath}`);
    return path.resolve(root, relative);
};

/** Connect package exports and modern ESM to the host's existing Babel rule. */
const withDocumentEditorWebpack4 = config => {
    if (Array.isArray(config)) return config.map(withDocumentEditorWebpack4);
    const source = '@kubohiroya/turbowarp-document-source';
    const documents = '@kubohiroya/turbowarp-document-data';
    const sourceRoot = path.dirname(require.resolve(`${source}/package.json`));
    const documentsRoot = path.dirname(require.resolve(`${documents}/package.json`, {paths: [sourceRoot]}));
    const roots = [__dirname, sourceRoot, documentsRoot];
    const adaptRule = rule => ({...rule,
        ...(rule.rules ? {rules: rule.rules.map(adaptRule)} : {}),
        ...(rule.oneOf ? {oneOf: rule.oneOf.map(adaptRule)} : {}),
        ...(typeof rule.loader === 'string' && /(?:^|[\\/])babel-loader(?:[\\/]|$)/u.test(rule.loader) && rule.include ?
            {include: [...(Array.isArray(rule.include) ? rule.include : [rule.include]), ...roots]} : {})
    });
    return {...config,
        module: {...config.module, rules: (config.module?.rules || []).map(adaptRule)},
        resolve: {...config.resolve, symlinks: true, alias: {...config.resolve?.alias,
            '@kubohiroya/turbowarp-document-editor$': path.join(__dirname, 'src/index.js'),
            [`${source}/project-views$`]: publicEntry(sourceRoot, './project-views'),
            [`${documents}/composition$`]: publicEntry(documentsRoot, './composition')
        }}
    };
};
module.exports = {withDocumentEditorWebpack4};
