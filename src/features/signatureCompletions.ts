import * as vscode from 'vscode'
import { range } from 'rambda'
import { getExtensionSetting } from 'vscode-framework'
import { jsLangs } from '../codeActions'

export const registerSignatureCompletions = () => {
    if (!getExtensionSetting('features.signatureCompletions')) return
    const triggerParameterHintsOnSignatureCompletions = getExtensionSetting('features.triggerParameterHintsOnSignatureCompletions')
    vscode.languages.registerCompletionItemProvider(jsLangs, {
        async provideCompletionItems(document, position, token, { triggerKind }) {
            if (triggerKind !== vscode.CompletionTriggerKind.Invoke) return
            const surroundingText = document.getText(new vscode.Range(position.translate(0, -1), position.translate(0, 1)))
            // TODO also provide other detections
            if (!(surroundingText.startsWith('(') || surroundingText.endsWith(')'))) return
            const result: vscode.SignatureHelp = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', document.uri, position)
            if (!result) return []
            // suggestions should be matched against selected signature by user
            const signature = result.signatures[result.activeSignature]!
            // const argsString = /\((.+)\)/.exec(signature.label)?.[1]
            // TS-aware only
            if (triggerParameterHintsOnSignatureCompletions) void vscode.commands.executeCommand('editor.action.triggerParameterHints')
            const args = signature.parameters.map(({ label }) => (typeof label === 'string' ? label : signature.label.slice(...label)))
            const completions = [] as vscode.CompletionItem[]

            const start = result.activeParameter
            for (const i of range(start, args.length)) {
                const currentArgs = args.slice(start, i + 1)
                const argNamesToInsert = currentArgs.map(label => argLabelToName(label))
                const completion = new vscode.CompletionItem({ label: argNamesToInsert.join(', '), description: 'SIGNATURE' }, vscode.CompletionItemKind.Field)
                const md = new vscode.MarkdownString()
                md.appendCodeblock(currentArgs.join('\n'), 'ts')
                completion.documentation = md
                completion.sortText = '!100'
                const snippet = new vscode.SnippetString()
                for (const [i, argName] of argNamesToInsert.entries()) {
                    snippet.appendPlaceholder(argName)
                    if (i !== argNamesToInsert.length - 1) snippet.appendText(', ')
                }

                completion.insertText = snippet
                completions.push(completion)
            }

            return completions
        },
    })
}

const argLabelToName = (label: string) =>
    label
        .replace(/(.+?):(.+)/, '$1')
        .replace(/\?$/, '')
        .trim()
