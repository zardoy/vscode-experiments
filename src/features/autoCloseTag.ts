import * as vscode from 'vscode'
import { equals } from 'rambda'
import { oneOf } from '@zardoy/utils'
import { getExtensionSetting } from 'vscode-framework'

export const registerAutoCloseTag = () => {
    if (!getExtensionSetting('features.jsxAutoCloseTag')) return
    const lastTwoChanges = [] as string[]
    vscode.workspace.onDidChangeTextDocument(async ({ contentChanges, document, reason }) => {
        const editor = vscode.window.activeTextEditor
        if (
            document.uri !== editor?.document.uri ||
            !document.languageId.endsWith('react') ||
            oneOf(reason, vscode.TextDocumentChangeReason.Undo, vscode.TextDocumentChangeReason.Redo)
        )
            return
        // ignoring content pasting
        if (contentChanges.length !== 1 || contentChanges[0]!.text.length !== 1) return
        lastTwoChanges.push(contentChanges[0]!.text)
        if (lastTwoChanges.length > 2) lastTwoChanges.splice(0, lastTwoChanges.length - 2)
        if (equals(lastTwoChanges, [...'</'])) {
            console.log('trigger autoCloseTag')
            const activePos = editor.selection.end
            const completions: vscode.CompletionList = await vscode.commands.executeCommand(
                'vscode.executeCompletionItemProvider',
                editor.document.uri,
                activePos,
            )
            const firstCompletion = completions.items[0]
            if (!firstCompletion) return
            const firstLabel = typeof firstCompletion.label === 'string' ? firstCompletion.label : firstCompletion.label.label
            if (firstLabel.startsWith('<') || !firstLabel.endsWith('>')) return
            const insertText = firstCompletion.insertText as string
            console.log(insertText)
            await editor.edit(
                builder => {
                    builder.delete(new vscode.Range(activePos.translate(0, -1), activePos.translate(0, 1)))
                },
                {
                    undoStopAfter: false,
                    undoStopBefore: false,
                },
            )
            const snippet = new vscode.SnippetString()
            snippet.appendTabstop(2)
            snippet.appendText(`</${insertText}`)
            snippet.appendTabstop(1)
            await editor.insertSnippet(snippet, activePos.translate(0, 1))
            // const workspaceEdit = new vscode.WorkspaceEdit()
            // workspaceEdit.insert(document.uri, activePos, insertText)
            // await vscode.workspace.applyEdit(workspaceEdit)
        }
    })
}
