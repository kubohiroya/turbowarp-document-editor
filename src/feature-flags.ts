// SPDX-License-Identifier: MPL-2.0
export function readYamlEditorFlags(search = '') {
    const query = new URLSearchParams(search);
    // Source-location controls have no switch of their own: they appear wherever the provider marks a
    // document's location as editable, inside an editor this flag has already enabled.
    return Object.freeze({embeddedYamlEditor: query.get('twPlusYamlEditor') === '1'});
}
