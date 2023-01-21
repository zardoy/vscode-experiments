import * as vscode from 'vscode'
import { range } from 'rambda'
import { getExtensionSetting } from 'vscode-framework'
import { lowerCaseFirst } from 'lower-case-first'

export const registerSignatureCompletions = () => {
    if (!getExtensionSetting('features.signatureCompletions')) return
    const triggerParameterHintsOnSignatureCompletions = getExtensionSetting('features.triggerParameterHintsOnSignatureCompletions')
    vscode.languages.registerCompletionItemProvider(getExtensionSetting('signatureCompletions.enableLanguages'), {
        async provideCompletionItems(document, position) {
            if (!position.character) return
            const surroundingText = document.getText(new vscode.Range(position.translate(0, -1), position.translate(0, 1)))
            // TODO also provide other detections
            if (!(surroundingText.startsWith('(') || surroundingText.endsWith(')'))) return
            const result: vscode.SignatureHelp | undefined = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', document.uri, position)
            if (!result) return []
            // suggestions should be matched against selected signature by user
            const signature = result.signatures[result.activeSignature]!
            // const argsString = /\((.+)\)/.exec(signature.label)?.[1]
            // TS-aware only
            if (triggerParameterHintsOnSignatureCompletions) void vscode.commands.executeCommand('editor.action.triggerParameterHints')
            const args = signature.parameters.map(({ label }) => (typeof label === 'string' ? label : signature.label.slice(...label)))
            const completions = [] as vscode.CompletionItem[]
            const usePlaceholder = getExtensionSetting('signatureCompletions.usePlaceholder')
            const currentWordRange = document.getWordRangeAtPosition(position)
            const currentWord = currentWordRange && document.getText(currentWordRange)

            const start = result.activeParameter
            for (const i of range(start, args.length)) {
                const currentArgs = args.slice(start, i + 1)
                const argNamesToInsert = currentArgs.map(label => argLabelToName(label))
                if (currentArgs.length === 1 && argNamesToInsert[0] === currentWord) continue
                const completion = new vscode.CompletionItem({ label: argNamesToInsert.join(', '), description: 'SIGNATURE' }, vscode.CompletionItemKind.Field)
                const md = new vscode.MarkdownString()
                md.appendCodeblock(currentArgs.join('\n'), 'ts')
                completion.documentation = md
                completion.sortText = '!100'
                const snippet = new vscode.SnippetString()
                for (const [i, argName] of argNamesToInsert.entries()) {
                    if (usePlaceholder) snippet.appendPlaceholder(argName)
                    else snippet.appendText(argName)

                    if (i !== argNamesToInsert.length - 1) snippet.appendText(', ')
                }

                completion.insertText = snippet
                completions.push(completion)
            }

            return completions
        },
    })
}

const argLabelToName = (label: string) => {
    const useTypeOnValue = getExtensionSetting('signatureCompletions.useTypeOnValue')
    return label
        .replace(/(.+?):(.+)/, (_match, arg, type) => {
            // assumed all types starting with uppercase
            // still fails with utility types
            type = type.trim()
            if (useTypeOnValue.split(', ').includes(arg) && /^[A-Z]/.test(type)) return lowerCaseFirst(type.match(/^([^<]+)<?/)![0])

            return arg
        })
        .replace(/\?$/, '')
        .trim()
}
