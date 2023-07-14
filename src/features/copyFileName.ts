import * as vscode from 'vscode'
import { basename } from 'path-browserify'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyFileName', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor) return
        let fileName = basename(activeEditor.document.uri.path)
        const dotIndex = fileName.lastIndexOf('.')
        if (dotIndex !== -1) fileName = fileName.slice(0, dotIndex)
        await vscode.env.clipboard.writeText(fileName)
    })
}
