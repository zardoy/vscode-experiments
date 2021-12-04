import vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'
import { jsLangs } from '../codeActions'

export const registerRegexCodeActions = () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const REGEX_REGEX = /\/(?!\*).+?(?<!\\)\//g

    // Almost done, doesn't work properly with const d = /**  *//d/. TODO FLAGS!
    vscode.languages.registerCodeActionsProvider(jsLangs, {
        async provideCodeActions(document, range, context, token) {
            if (context.triggerKind !== vscode.CodeActionTriggerKind.Invoke) return
            if (!range.start.isEqual(range.end)) return
            const pos = range.start
            // maybe even open as side-panel?
            for (const match of document.lineAt(pos).text.matchAll(REGEX_REGEX) ?? []) {
                const regexRange = new vscode.Range(
                    ...([match.index!, match.index! + match[0]!.length].map(ch => pos.with(undefined, ch)) as [vscode.Position, vscode.Position]),
                )
                if (regexRange.intersection(new vscode.Range(pos, pos))) {
                    console.log('regex detected', match[0])
                    const clipboardRegex = /^\/(?!\*).+?(?<!\\)\//.exec(await vscode.env.clipboard.readText())
                    const additionalCodeActions: vscode.CodeAction[] = []
                    if (clipboardRegex) {
                        const workspaceEdit = new vscode.WorkspaceEdit()
                        workspaceEdit.replace(document.uri, regexRange, clipboardRegex[0]!)
                        additionalCodeActions.push({
                            title: 'Replace with regex from clipboard',
                            kind: vscode.CodeActionKind.RefactorRewrite,
                            edit: workspaceEdit,
                        })
                    }

                    return [
                        {
                            title: 'Test with regex101.com',
                            command: getExtensionCommandId('openUrl'),
                            isPreferred: true,
                            arguments: [`https://regex101.com/?regex=${match[0]!.slice(1, -1)}&flags=gi`],
                        },
                        ...additionalCodeActions,
                    ]
                }
            }

            return []
        },
    })
}
