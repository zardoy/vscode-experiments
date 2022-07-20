import * as vscode from 'vscode'
import { defaultJsSupersetLangs } from '@zardoy/vscode-utils/build/langs'
import { getExtensionCommandId } from 'vscode-framework'

export const registerRegexCodeActions = () => {
    const REGEX_REGEX = /\/(?!\*|>).+?(?<!\\)\//g

    // Almost done, doesn't work properly with const d = /**  *//d/. TODO FLAGS!
    vscode.languages.registerCodeActionsProvider(defaultJsSupersetLangs, {
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
                    // eslint-disable-next-line no-await-in-loop
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

                    // const url = `https://regex101.com/?regex=${encodeURIComponent('.+:.+;')}?&flags=gi`
                    return [
                        {
                            title: 'Test with regex101.com',
                            command: getExtensionCommandId('openUrl'),
                            isPreferred: true,
                            arguments: [`https://regex101.com/?regex=${encodeURIComponent(match[0]!.slice(1, -1))}&flags=gi`],
                        },
                        ...additionalCodeActions,
                    ]
                }
            }

            return []
        },
    })
}
