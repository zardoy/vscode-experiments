import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('nextLetterSwapCase', async () => {
        const editor = vscode.window.activeTextEditor
        if (editor?.viewColumn === undefined) return

        await editor.edit(builder => {
            for (const selection of editor.selections) {
                const range = new vscode.Range(selection.end, selection.end.translate(0, 1))
                const letter = editor.document.getText(range)
                builder.replace(range, letter.toLocaleUpperCase() === letter ? letter.toLowerCase() : letter.toUpperCase())
            }
        })
    })
}
