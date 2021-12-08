import {} from '@zardoy/utils'
import vscode from 'vscode'
import { equals, pluck } from 'rambda'
import { getExtensionSetting } from 'vscode-framework'
import { oneOf } from 'vscode-framework/build/util'
import { jsLangs } from '../codeActions'

export const registerOnTypeFormatter = () => {
    if (!getExtensionSetting('features.onTypeTsFormatter')) return
    let eqTyped = false
    let thisEdit = false
    vscode.workspace.onDidChangeTextDocument(async ({ document, contentChanges, reason }) => {
        const editor = vscode.window.activeTextEditor
        if (document.uri !== editor?.document.uri || !oneOf(document.languageId, jsLangs)) return
        if (
            oneOf(reason, [vscode.TextDocumentChangeReason.Redo, vscode.TextDocumentChangeReason.Undo]) ||
            !equals(
                contentChanges.map(({ text }) => text),
                ['='],
            )
        ) {
            if (!thisEdit) {
                thisEdit = false
                console.log('reset')
                eqTyped = false
            }

            return
        }

        const changePos = contentChanges[0]!.range.end
        await editor.edit(
            builder => {
                thisEdit = true
                const charBeforeRange = new vscode.Range(changePos.translate(0, -3), changePos.translate(0, -2))
                console.log('go', eqTyped)
                if (eqTyped) {
                    eqTyped = false
                    builder.replace(charBeforeRange, '=')
                } else {
                    eqTyped = true
                    if (editor.document.getText(charBeforeRange) !== ' ') builder.insert(changePos, ' ')
                    builder.insert(changePos.translate(0, 1), ' ')
                }
            },
            {
                undoStopAfter: true,
                undoStopBefore: true,
            },
        )
    })
    // TODO it doesn't work O_O
    // vscode.languages.registerOnTypeFormattingEditProvider(
    //     'typescript',
    //     {
    //         provideOnTypeFormattingEdits(document, position, ch, options, token) {
    //             console.log('format', ch)
    //             return []
    //         },
    //     },
    //     '=',
    //     '-',
    // )
}
