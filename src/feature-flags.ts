export function readYamlEditorFlags(search = '') {
    const query = new URLSearchParams(search);
    return Object.freeze({embeddedYamlEditor: query.get('twPlusYamlEditor') === '1', documentSources: query.get('twPlusDocumentSource') === '1'});
}
