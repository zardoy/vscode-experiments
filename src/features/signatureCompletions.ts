import vscode from 'vscode'
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
            const args = signature.parameters
                .map(({ label }) => (typeof label === 'string' ? label : signature.label.slice(...label)))
                .map(str =>
                    str
                        .replace(/(.+?):.+/, '$1')
                        .replace(/\?$/, '')
                        .trim(),
                )
            const completions = [] as vscode.CompletionItem[]
            let prevSuggestionText = ''
            for (const arg of args.slice(result.activeParameter)) {
                const label = `${prevSuggestionText}${arg}`
                const completion = new vscode.CompletionItem({ label, description: 'SIGNATURE' }, vscode.CompletionItemKind.Field)
                completion.sortText = '!100'
                prevSuggestionText = `${label}, `
                completion.insertText = prevSuggestionText
                completions.push(completion)
            }

            return completions
        },
    })
}
