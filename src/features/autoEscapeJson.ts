import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { getJsonCompletingInfo } from '@zardoy/vscode-utils/build/jsonCompletions'
import { getLocation } from 'jsonc-parser'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    vscode.workspace.onDidChangeTextDocument(({ document, contentChanges, reason }) => {
        const activeEditor = vscode.window.activeTextEditor
        if (document.uri !== activeEditor?.document.uri) return
        if (!vscode.languages.match(['json', 'jsonc'], document)) return
        if (oneOf(reason, vscode.TextDocumentChangeReason.Redo, vscode.TextDocumentChangeReason.Undo)) return
        if (!getExtensionSetting('autoEscapeQuoteJson')) return
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const firstChangeRange = contentChanges[0]?.range!
        // TODO support multicursor
        if (contentChanges.length !== 1 || !['"'].includes(contentChanges[0]!.text) || !firstChangeRange.start.isEqual(firstChangeRange.end)) return
        const position = firstChangeRange.start
        const offset = document.offsetAt(position)
        const text = document.getText()
        const textWithoutQuote = text.slice(0, offset) + text.slice(offset + 1)
        const location = getLocation(textWithoutQuote, offset)
        const { insideStringRange } = getJsonCompletingInfo(location, document, position) || {}
        if (!insideStringRange) return
        void activeEditor.edit(
            builder => {
                builder.insert(position, '\\')
            },
            { undoStopAfter: false, undoStopBefore: false },
        )
    })
}
