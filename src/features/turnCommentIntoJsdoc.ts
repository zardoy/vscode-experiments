import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('turnCommentIntoJsdoc', () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        void activeTextEditor.edit(builder => {
            for (const selection of activeTextEditor.selections) {
                const { line } = selection.active
                const lineText = activeTextEditor.document.lineAt(line).text
                const match = /(\s*)\/\//.exec(lineText)
                if (match) {
                    const startPos = new vscode.Position(line, match[1]!.length)
                    builder.replace(new vscode.Range(startPos, startPos.translate(0, 2)), '/**')
                    builder.insert(new vscode.Position(line, Number.POSITIVE_INFINITY), ' */')
                }
            }
        })
    })
}
