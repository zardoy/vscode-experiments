import vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { registerExtensionCommand } from 'vscode-framework'

export const registerInsertAutoCompletions = () => {
    registerExtensionCommand(
        'insertAutoCompletions',
        async (_, { snippetType = 'all', kind = 'all' }: { snippetType?: 'all' | 'each'; kind?: 'all' | 'method' | 'prop' } = {}) => {
            const activeEditor = vscode.window.activeTextEditor
            if (!activeEditor || activeEditor.viewColumn === undefined) return
            // TODO how it make sense to run on each selection
            const activePos = activeEditor.selection.end
            const completions: vscode.CompletionList = await vscode.commands.executeCommand(
                'vscode.executeCompletionItemProvider',
                activeEditor.document.uri,
                activePos,
            )
            const kinds: vscode.CompletionItemKind[] = []
            if (oneOf(kind, 'all', 'prop')) kinds.push(vscode.CompletionItemKind.Property, vscode.CompletionItemKind.Field)
            if (oneOf(kind, 'all', 'method')) kinds.push(vscode.CompletionItemKind.Method)
            const competionsFiltered = completions.items.filter(({ kind }) => kinds.includes(kind!))
            // console.log(kind, completions.items.filter(({ kind }) => kind === vscode.CompletionItemKind.Method)![0]!)
            // console.log(competionsFiltered.filter(({ label }) => typeof label !== 'string'))
            const labelCompletions = competionsFiltered.map(({ label, kind }) => ({ label: typeof label === 'string' ? label : label.label, kind }))
            const snippet = new vscode.SnippetString()
            const num = snippetType === 'all' ? 1 : undefined
            const insertNewLine = activeEditor.document.lineAt(activePos).isEmptyOrWhitespace
            //TS-aware only
            const isInDestruct = /\s*}:/.test(activeEditor.document.getText(new vscode.Range(activePos, activePos.translate(0, 4))))
            for (const [i, { label: labelCompletion, kind }] of labelCompletions.entries()) {
                snippet.appendText(isInDestruct || kind === vscode.CompletionItemKind.Method ? labelCompletion : `${labelCompletion}: `)
                if (!isInDestruct) snippet.appendTabstop(num)
                snippet.appendText(',')
                if (i !== labelCompletions.length - 1) snippet.appendText(insertNewLine ? '\n' : ' ')
            }

            await activeEditor.insertSnippet(snippet)
        },
    )
}
