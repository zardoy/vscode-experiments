import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerFixedPaste = () => {
    let lastPasteRange: vscode.Selection | undefined
    // TODO test https://github.com/rubymaniac/vscode-paste-and-indent/blob/master/src/extension.ts
    registerExtensionCommand('fixedPaste', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const currentPos = activeEditor.selection.start
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction')
        // no-op for now
        if (activeEditor.selections.length > 1) return
        const newPos = activeEditor.selection.start
        // eslint-disable-next-line no-multi-assign
        lastPasteRange = activeEditor.selection = new vscode.Selection(currentPos, newPos)
        await vscode.commands.executeCommand('editor.action.reindentselectedlines')
        activeEditor.selection = new vscode.Selection(newPos, newPos)
    })
    registerExtensionCommand('jsonAwarePaste', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const clipboardText = await vscode.env.clipboard.readText()
        const fixedText = clipboardText.split('"').join('\\"')
        await activeEditor.edit(builder => {
            for (const selection of activeEditor.selections) builder.replace(selection, fixedText)
        })
    })
    registerExtensionCommand('focusLastPasteRange', () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined || !lastPasteRange) return
        activeEditor.selection = lastPasteRange
    })
}
