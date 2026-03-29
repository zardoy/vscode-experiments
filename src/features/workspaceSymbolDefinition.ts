import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('peekWorkspaceSymbolDefinitions', () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const { document } = editor
        const position = editor.selection.active
        const wordRange = document.getWordRangeAtPosition(position)
        if (!wordRange) return
        const word = document.getText(wordRange)
    })
}
