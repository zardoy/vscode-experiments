import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerGoToMatchingTagOrPair = () => {
    registerExtensionCommand('goToMatchingTagOrPair', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const initialPos = activeEditor.selection.end
        await vscode.commands.executeCommand('editor.emmet.action.matchTag')
        const currentPos = activeEditor.selection.end
        if (currentPos.isEqual(initialPos)) await vscode.commands.executeCommand('editor.action.jumpToBracket')
    })
}
