// SPDX-License-Identifier: MPL-2.0
export function readYamlEditorFlags(search = '') {
    const query = new URLSearchParams(search);
    return Object.freeze({embeddedYamlEditor: query.get('twPlusYamlEditor') === '1', documentSources: query.get('twPlusDocumentSource') === '1'});
}
