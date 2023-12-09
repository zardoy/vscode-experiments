import * as vscode from 'vscode'
import { makeOutlineChainFromPos } from '@zardoy/vscode-utils/build/outline'

export default () => {
    vscode.languages.registerCodeActionsProvider(['javascriptreact', 'typescriptreact'], {
        async provideCodeActions(document, range, context, token) {
            const tagRange = document.getWordRangeAtPosition(range.start, /<[A-Z][-\da-zA-Z]+/)
            if (!tagRange) return
            const diagnostic = context.diagnostics.find(d => d.message.startsWith('Cannot find name'))
            if (!diagnostic) return
            const componentName = /'(.+?)'/.exec(diagnostic.message)?.[1]
            if (!componentName) return
            const outline = await vscode.commands.executeCommand<vscode.DocumentSymbol[] | undefined>('vscode.executeDocumentSymbolProvider', document.uri)
            if (!outline) return
            const topItem = makeOutlineChainFromPos(outline, range.start)[0]
            if (!topItem) return
            const edit = new vscode.WorkspaceEdit()
            const textEdit = new vscode.SnippetTextEdit(
                new vscode.Range(topItem.range.end, topItem.range.end),
                new vscode.SnippetString(`\n\nfunction ${componentName}() {\n\treturn \${1:<div>$0</div>}\n}\n`),
            )
            edit.set(document.uri, [textEdit])
            return [
                {
                    title: 'Declare Component Below',
                    kind: vscode.CodeActionKind.QuickFix,
                    isPreferred: true,
                    edit,
                },
            ]
        },
    })
}
