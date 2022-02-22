import * as vscode from 'vscode'
import { range } from 'rambda'
import { getExtensionSetting } from 'vscode-framework'
import { lowerCaseFirst } from 'lower-case-first'
import { jsLangs } from '../codeActions'
import { registerWithSetting } from '../util'

export const registerSignatureCompletions = () => {
    registerWithSetting(['features.signatureCompletions', 'signatureCompletions.enableLanguages'], settings => {
        if (!settings.featuresSignatureCompletions) return

        return vscode.languages.registerCompletionItemProvider(settings.signatureCompletionsEnableLanguages, {
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
                if (getExtensionSetting('features.triggerParameterHintsOnSignatureCompletions'))
                    void vscode.commands.executeCommand('editor.action.triggerParameterHints')
                const args = signature.parameters.map(({ label }) => (typeof label === 'string' ? label : signature.label.slice(...label)))
                const completions = [] as vscode.CompletionItem[]

                const start = result.activeParameter
                for (const i of range(start, args.length)) {
                    const currentArgs = args.slice(start, i + 1)
                    const argNamesToInsert = currentArgs.map(label => argLabelToName(label))
                    const completion = new vscode.CompletionItem(
                        { label: argNamesToInsert.join(', '), description: 'SIGNATURE' },
                        vscode.CompletionItemKind.Field,
                    )
                    const md = new vscode.MarkdownString()
                    md.appendCodeblock(currentArgs.join('\n'), 'ts')
                    completion.documentation = md
                    completion.sortText = '!150'
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
    })
}

const argLabelToName = (label: string) => {
    const useTypeOnValue = getExtensionSetting('signatureCompletions.useTypeOnValue')
    // TODO change syntax
    const replaceValue = getExtensionSetting('signatureCompletions.replaceValue')
    return label
        .replace(/(.+?):(.+)/, (_match, arg, type) => {
            // assumed all types starting with uppercase
            // still fails with utility types
            type = type.trim()
            if (useTypeOnValue.includes(arg) && /^[A-Z]/.test(type)) return lowerCaseFirst(type.match(/^([^<]+)<?/)![0])

            return replaceValue[type] ?? type
        })
        .replace(/\?$/, '')
        .trim()
}
