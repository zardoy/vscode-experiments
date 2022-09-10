import * as vscode from 'vscode'
import { getExtensionContributionsPrefix, registerExtensionCommand } from 'vscode-framework'

const SCHEME = `${getExtensionContributionsPrefix()}completionsKindPlayground`

export default () => {
    vscode.workspace.registerFileSystemProvider(SCHEME, {
        createDirectory() {},
        delete() {},
        onDidChangeFile() {
            return { dispose() {} }
        },
        readDirectory() {
            return []
        },
        readFile() {
            const startContent = ''
            return new TextEncoder().encode(startContent)
        },
        rename() {},
        stat() {
            return { ctime: 0, mtime: 0, size: 0, type: 0 }
        },
        watch() {
            return { dispose() {} }
        },
        writeFile(uri, content) {},
    })

    vscode.languages.registerCompletionItemProvider(
        { scheme: SCHEME },
        {
            provideCompletionItems(document, position, token, context) {
                return Object.values(vscode.CompletionItemKind)
                    .map((kind, index): vscode.CompletionItem => {
                        if (typeof kind === 'number') return undefined!
                        return {
                            label: kind,
                            kind: vscode.CompletionItemKind[kind],
                            sortText: index.toString(),
                        }
                    })
                    .filter(Boolean)
            },
        },
    )

    registerExtensionCommand('openCompletionKindPlayground', async () => {
        await vscode.window.showTextDocument(vscode.Uri.from({ scheme: SCHEME, path: '/' }))
    })
}
