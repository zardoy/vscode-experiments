import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerInsertComma = () => {
    registerExtensionCommand('insertComma', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor) return
        // TODO insert at all lines
        const { document } = activeEditor
        await activeEditor.edit(builder => {
            for (const selection of activeEditor.selections) {
                const pos = document.lineAt(selection.active).range.end
                if (document.getText(new vscode.Range(pos.translate(0, -1), pos)) !== ',') builder.insert(pos, ',')
            }
        })
    })
}
