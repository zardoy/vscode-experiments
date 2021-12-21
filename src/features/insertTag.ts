import vscode from 'vscode'
import { registerActiveDevelopmentCommand, registerExtensionCommand } from 'vscode-framework'

export const registerInsertTag = () => {
    registerExtensionCommand('insertTag', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor) return
        return new Promise<void>(resolve => {
            const disposable = vscode.workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
                if (document.uri !== activeEditor.document.uri) return
                const pos = contentChanges[0]!.range.start.translate(0, 4)
                activeEditor.selection = new vscode.Selection(pos, pos)
                disposable.dispose()
                resolve()
            })
            void vscode.commands.executeCommand('editor.emmet.action.wrapWithAbbreviation', {
                abbreviation: 'div',
            })
        })
    })
}
