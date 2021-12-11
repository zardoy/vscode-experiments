import vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { jsLangs } from '../codeActions'

export const registerSignatureCompletions = () => {
    if (!getExtensionSetting('features.signatureCompletions')) return
    vscode.languages.registerCompletionItemProvider(jsLangs, {
        async provideCompletionItems(document, position, token, { triggerKind }) {
            if (triggerKind !== vscode.CompletionTriggerKind.Invoke) return
            console.time('exec')
            const result: vscode.SignatureHelp = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', document.uri, position)
            console.timeEnd('exec')
            if (!result) return []
            // suggestions should be matched against selected signature by user
            const signature = result.signatures[result.activeSignature]!
            const argsString = /\((.+)\)/.exec(signature.label)?.[1]
            if (!argsString) return []
            // TS-aware only
            const args = argsString.split(',').map(str =>
                str
                    .replace(/(.+):.+/, '$1')
                    .replace(/\?$/, '')
                    .trim(),
            )
            const completions = [] as vscode.CompletionItem[]
            let prevSuggestionText = ''
            for (const arg of args.slice(result.activeParameter)) {
                const label = `${prevSuggestionText}${arg}`
                const completion = new vscode.CompletionItem({ label, description: 'SIGNATURE COMPLETION' }, vscode.CompletionItemKind.Field)
                completion.sortText = '!100'
                prevSuggestionText = `${label}, `
                completion.insertText = prevSuggestionText
                completions.push(completion)
            }

            return completions
        },
    })
}
