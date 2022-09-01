import * as vscode from 'vscode'
import { getActiveRegularEditor, rangeToSelection } from '@zardoy/vscode-utils'
import { registerExtensionCommand, showQuickPick } from 'vscode-framework'

export default () => {
    registerExtensionCommand('fixHintDiagnostics', async () => {
        const textEditor = getActiveRegularEditor()
        if (!textEditor) return
        const diagnostics = vscode.languages
            .getDiagnostics(textEditor.document.uri)
            .filter(diagnostic => diagnostic.severity === vscode.DiagnosticSeverity.Hint)
        const { selections } = textEditor
        const codeFixes = await Promise.all(diagnostics.map(async diagnostic => findDiagnosticFixes(textEditor.document.uri, diagnostic)))
        const quickPick = vscode.window.createQuickPick()
        quickPick.canSelectMany = true
        quickPick.title = 'Select diagnostics to fix'
        quickPick.items = diagnostics.map(({ message, code = '' }, i) => {
            const quickFix = codeFixes[i]
            return {
                label: `${message}`,
                detail: quickFix?.title,
                description: `${typeof code === 'object' ? code.value : code}`,
                value: i,
            }
        })
        quickPick.onDidHide(() => quickPick.dispose())
        quickPick.onDidChangeActive(([item]) => {
            if (!item) return
            const { range } = diagnostics[(item as any).value]!
            textEditor.selection = rangeToSelection(range)
            textEditor.revealRange(range)
        })
        quickPick.show()
        await new Promise<void>(resolve => {
            quickPick.onDidAccept(async () => {
                quickPick.hide()
                const { selectedItems } = quickPick
                const mainWorkspaceEdit = new vscode.WorkspaceEdit()
                // const commands = [] as vscode.Command[]
                const selectedCodeFixes = selectedItems.map(({ value }: any) => [codeFixes[value], value] as const)
                const newSelections: vscode.Selection[] = []
                for (const [codeFix, index] of selectedCodeFixes) {
                    if (!codeFix) continue
                    const needSelection = !codeFix.edit && !codeFix.command
                    if (!needSelection) continue
                    const diagnostic = diagnostics[index]!
                    newSelections.push(rangeToSelection(diagnostic.range))
                }

                for (const [codeFix, index] of selectedCodeFixes) {
                    if (!codeFix) continue
                    const diagnostic = diagnostics[index]!
                    // eslint-disable-next-line no-await-in-loop
                    const { edit: workspaceEdit } = (await applyCodeAction(textEditor, diagnostic, codeFix)) ?? {}
                    if (workspaceEdit) (mainWorkspaceEdit as any)._edits.push(...(workspaceEdit as any)._edits)
                    // if (command) commands.push(command)
                }

                await vscode.workspace.applyEdit(mainWorkspaceEdit)

                // for (const { command, arguments: args = [] } of commands) void vscode.commands.executeCommand(command, ...args)

                resolve()

                async function applyCodeAction(editor: vscode.TextEditor, diagnostic: vscode.Diagnostic, inputCodeAction: vscode.CodeAction) {
                    const needSelection = !inputCodeAction.edit && !inputCodeAction.command
                    if (needSelection) editor.selection = rangeToSelection(diagnostic.range)
                    const codeAction = await findDiagnosticFixes(editor.document.uri, diagnostic)

                    if (!codeAction || (!codeAction.edit && !codeAction.command))
                        throw new Error(`Diagnostic ${diagnostic.message} has no code action (action)`)

                    const { edit, command } = codeAction
                    if (edit && command) void vscode.commands.executeCommand(command.command, ...(command.arguments ?? []))
                    if (edit) return { edit }
                    if (!command) return
                    const activeEditor = vscode.window.activeTextEditor!
                    const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
                        if (contentChanges.length === 0 || activeEditor?.document.uri.toString() !== document.uri.toString()) return
                        dispose()
                    })
                    await vscode.commands.executeCommand(command.command, ...(command.arguments ?? []))
                    return undefined
                }
            })
        })
        textEditor.selections = selections
    })
}

async function findDiagnosticFixes(editorUri: vscode.Uri, diagnostic: vscode.Diagnostic) {
    const codeActions: vscode.CodeAction[] = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', editorUri, diagnostic.range)
    const compareKey = diagnostic.code ? 'code' : 'message'
    return codeActions.find(
        ({ diagnostics, kind, isPreferred }) =>
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            diagnostics?.some(val => val[compareKey] === diagnostic[compareKey]) || kind?.contains(vscode.CodeActionKind.QuickFix) || isPreferred,
    )
}
