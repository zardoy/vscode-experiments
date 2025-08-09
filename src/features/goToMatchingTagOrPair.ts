import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('goToMatchingTagOrPair', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (activeEditor?.viewColumn === undefined) return
        const { document } = activeEditor
        const pos = activeEditor.selection.start

        // Get previous character if not at start of line
        const prevChar = pos.character > 0
            ? document.getText(new vscode.Range(pos.translate(0, -1), pos))
            : ''

        const nextChar = document.getText(new vscode.Range(pos, pos.translate(0, 1)))
        const brackets = new Set(['(', ')', '[', ']', '{', '}'])
        const hasBracket = brackets.has(prevChar) || brackets.has(nextChar)
        const initialPos = activeEditor.selection.end
        if (!hasBracket) await vscode.commands.executeCommand('editor.emmet.action.matchTag')

        const currentPos = activeEditor.selection.end
        if (currentPos.isEqual(initialPos)) await vscode.commands.executeCommand('editor.action.jumpToBracket')
    })
}
