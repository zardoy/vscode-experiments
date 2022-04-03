import * as vscode from 'vscode'
import { camelCase } from 'change-case'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import { getExtensionSetting } from 'vscode-framework'

export const registerSuggestDefaultImportName = () => {
    if (!getExtensionSetting('features.suggestImportName')) return
    vscode.languages.registerCompletionItemProvider(defaultJsSupersetLangsWithVue, {
        provideCompletionItems(document, position, token, context) {
            const matchImport = /import (\w*) from (['"].*['"])/.exec(document.lineAt(position).text)
            if (!matchImport) return []
            const importPath = matchImport[2]!.slice(1, -1)
            const startLength = 'import '.length
            if (position.character < startLength || position.character > startLength + matchImport[1]!.length) return
            // TODO investigate parent imports
            const importParts = importPath
                .split('/')
                .filter(str => ![...str].every(ch => ch === '.'))
                .map(str => camelCase(str))
            const completions: vscode.CompletionItem[] = []
            for (const [i, _] of importParts.entries())
                completions.push({
                    label: {
                        label: importParts
                            .slice(0, i + 1)
                            .map((str, i) => (i ? str[0]!.toUpperCase() + str.slice(1) : str))
                            .join(''),
                        description: 'suggest default',
                    },
                    sortText: '!30',
                })

            return completions
        },
    })
}
