import * as vscode from 'vscode'
import { equals } from 'rambda'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('autoRemoveSemicolon.enable')) return
    vscode.workspace.onDidChangeTextDocument(async ({ document, contentChanges }) => {
        const textEditor = vscode.window.activeTextEditor

        if (
            document.uri !== textEditor?.document.uri ||
            textEditor.viewColumn === undefined ||
            !vscode.languages.match(defaultJsSupersetLangsWithVue, document) ||
            contentChanges.length === 0
        )
            return

        let line: vscode.TextLine
        try {
            line = document.lineAt(contentChanges[0]!.range.end)
        } catch {
            return
        }

        if (
            equals(
                contentChanges.map(({ text }) => text),
                ['.'],
            ) &&
            /;.$/.test(line.text)
        ) {
            await textEditor.edit(
                editBuilder => {
                    const endPos = contentChanges[0]!.range.end
                    editBuilder.delete(new vscode.Range(endPos.translate(0, -1), endPos))
                },
                { undoStopAfter: false, undoStopBefore: false },
            )
            await vscode.commands.executeCommand('editor.action.triggerSuggest')
        }

        if (
            equals(
                contentChanges.map(({ text }) => text),
                [')', '('],
            ) &&
            document.lineAt(contentChanges[0]!.range.end).text.endsWith(';)')
        )
            await textEditor.edit(editBuilder => {
                const endPos = document.lineAt(contentChanges[0]!.range.end).range.end.translate(0, -1)
                editBuilder.delete(new vscode.Range(endPos.translate(0, -1), endPos))
            })
    })
}
