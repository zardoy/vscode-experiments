import * as vscode from 'vscode'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('typescriptHighlightedKeywordReferences')) return
    vscode.languages.registerReferenceProvider([...defaultJsSupersetLangsWithVue, 'html'], {
        async provideReferences(document, position, context, token) {
            const wordRange = document.getWordRangeAtPosition(position)
            if (!wordRange) return
            const word = document.getText(wordRange)
            // already works with `this`
            const allowList = 'return async await if else for while break continue try catch finally switch case export'.split(' ')
            if (!allowList.includes(word)) return
            const highlights: vscode.DocumentHighlight[] | undefined =
                (await vscode.commands.executeCommand('vscode.executeDocumentHighlights', document.uri, position)) ?? []
            const locations: vscode.Location[] = highlights.map(({ range }) => new vscode.Location(document.uri, range))
            return locations
        },
    })
}
