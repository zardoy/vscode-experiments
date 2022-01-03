import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerFixedPaste = () => {
    registerExtensionCommand('fixedPaste', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const currentPos = activeEditor.selection.start
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction')
        const newPos = activeEditor.selection.start
        activeEditor.selection = new vscode.Selection(currentPos, newPos)
        await vscode.commands.executeCommand('editor.action.reindentselectedlines')
        activeEditor.selection = new vscode.Selection(newPos, newPos)
    })
    registerExtensionCommand('jsonAwarePaste', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const clipboardText = await vscode.env.clipboard.readText()
        const fixedText = clipboardText.split('"').join('\\"')
        await activeEditor.edit(builder => builder.replace(activeEditor.selection, fixedText))
    })
}
