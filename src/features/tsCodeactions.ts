import * as vscode from 'vscode'
import { defaultJsSupersetLangsWithVue } from '@zardoy/vscode-utils/build/langs'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('features.tsCodeActions')) return
    // TODO schema. check that works on virtual workspaces (e.g. github repos)

    vscode.languages.registerCodeActionsProvider(defaultJsSupersetLangsWithVue, {
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

            const lineText = document.lineAt(pos.line).text
            const firstCharIndex = document.lineAt(pos).firstNonWhitespaceCharacterIndex
            const exportableMatch = /^(const|function|class|type|interface)\b/.exec(lineText)
            if (exportableMatch) {
                const workspaceEdit = new vscode.WorkspaceEdit()
                workspaceEdit.insert(document.uri, pos.with(undefined, 0), 'export ')
                codeActions.push({
                    title: 'Add export',
                    kind: vscode.CodeActionKind.Refactor,
                    isPreferred: true,
                    edit: workspaceEdit,
                })
            }

            const forMatch = /^\s*(for\s?\((const|let) (.+?) of (.+?)\))/.exec(lineText)
            if (forMatch) {
                const workspaceEdit = new vscode.WorkspaceEdit()
                const firstChar = firstCharIndex
                workspaceEdit.replace(
                    document.uri,
                    new vscode.Range(pos.with(undefined, firstChar), pos.with(undefined, firstChar + forMatch[1]!.length)),
                    `for (${forMatch[2]!} [i, ${forMatch[3]!}] of ${forMatch[4]!}.entries())`,
                )
                codeActions.push({
                    title: 'Add i to for',
                    edit: workspaceEdit,
                    kind: vscode.CodeActionKind.RefactorRewrite,
                })
            }

            return codeActions
        },
    })
}
