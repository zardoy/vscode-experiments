import vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { jsLangs } from '../codeActions'
export const registerTsCodeactions = () => {
    if (!getExtensionSetting('features.tsCodeActions')) return
    // TODO schema. check that works on virtual workspaces (e.g. github repos)

    vscode.languages.registerCodeActionsProvider(
        jsLangs.map(lang => ({ language: lang })),
        {
            provideCodeActions(document, range, context, token) {
                // TODO util?
                if (
                    !range.start.isEqual(range.end) ||
                    // TODO remove this check
                    context.triggerKind !== vscode.CodeActionTriggerKind.Invoke
                )
                    return
                const pos = range.start
                const wordRange = document.getWordRangeAtPosition(pos)
                const codeActions = [] as vscode.CodeAction[]
                if (wordRange) {
                    const wordAtCursor = document.getText(wordRange)
                    if (wordAtCursor === 'const') {
                        const workspaceEdit = new vscode.WorkspaceEdit()
                        workspaceEdit.replace(document.uri, wordRange, 'let')
                        codeActions.push({
                            title: 'Change to let',
                            edit: workspaceEdit,
                        })
                    }
                }

                const match = /^(const|function|class)\b/.exec(document.lineAt(pos.line).text)
                if (match) {
                    const workspaceEdit = new vscode.WorkspaceEdit()
                    workspaceEdit.insert(document.uri, pos.with(undefined, 0), 'export ')
                    codeActions.push({
                        title: 'Add export',
                        kind: vscode.CodeActionKind.Refactor,
                        isPreferred: true,
                        edit: workspaceEdit,
                    })
                }

                return codeActions
            },
        },
    )
}
