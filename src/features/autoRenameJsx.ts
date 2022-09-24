import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('autoRenameJsxTag')) return
    vscode.languages.registerLinkedEditingRangeProvider(['vue', 'javascriptreact', 'typescriptreact'], {
        async provideLinkedEditingRanges(document, position, token) {
            // https://github.com/zardoy/vetur-extended/blob/8d39e7f6df6a2528c202427e0f2b02d87a3d4314/src/gotoDefinition.ts#L32
            // have no idea what to do with generics for now
            // easy way: use getNodeAtPosition to ensure its jsx element, but for me its not annoying
            const componentRange = document.getWordRangeAtPosition(position, /<\/?([-\d\w])+/) // (?=(\s|\/?>))
            if (!componentRange) return
            const highlights: vscode.DocumentHighlight[] | undefined =
                (await vscode.commands.executeCommand('vscode.executeDocumentHighlights', document.uri, position)) ?? []
            return {
                ranges: highlights.map(({ range }) => range),
                wordPattern: undefined,
            }
        },
    })
}
