/* eslint-disable unicorn/consistent-destructuring */
import * as vscode from 'vscode'
import { getActiveRegularEditor, rangeToSelection, selectionToRange } from '@zardoy/vscode-utils'
import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'
import { compact } from '@zardoy/utils'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'

export default () => {
    registerExtensionCommand('fixAllDiagnostics', async (_, { severity }: { severity?: keyof typeof vscode.DiagnosticSeverity } = {}) => {
        const editor = getActiveRegularEditor()!
        if (!editor as any) return
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri).filter(diagnostic => {
            if (!severity) return true
            return diagnostic.severity === vscode.DiagnosticSeverity[severity]
        })
        const { selections } = editor
        const codeFixes = await Promise.all(diagnostics.map(async diagnostic => findDiagnosticFixes(editor.document.uri, diagnostic)))
        const selectedItems = await showQuickPick(
            diagnostics.map(({ message, code = '', source }, i) => {
                const quickFix = codeFixes[i]
                return {
                    label: `${message}`,
                    detail: quickFix?.title,
                    description: `${source ?? ''} ${typeof code === 'object' ? code.value : code}`,
                    value: i,
                }
            }),
            {
                title: 'Select diagnostics to fix',
                canPickMany: true,
                onDidChangeActive([item], index) {
                    if (!item) return
                    const { range } = diagnostics[item.value]!
                    editor.selection = rangeToSelection(range)
                    editor.revealRange(range)
                },
                matchOnDescription: true,
                matchOnDetail: true,
            },
        )
        if (!selectedItems) return

        const mainWorkspaceEdit = new vscode.WorkspaceEdit()
        let codeActionNeedsSelectionIndex = 0
        type Metadata = {
            needsSelectionIndex?: number
            skipSelectionResetting: boolean
        }
        const selectedCodeFixes = selectedItems.map(index => {
            const needsSelectionIndex = !codeFixes[index]?.edit || codeFixes[index]?.command ? codeActionNeedsSelectionIndex++ : undefined
            return [
                codeFixes[index],
                diagnostics[index]!,
                {
                    needsSelectionIndex,
                    skipSelectionResetting: !!codeFixes[index]?.command,
                } as Metadata,
            ] as const
        })

        const codeActionsToSelect = compact(
            selectedCodeFixes.map(([_, diagnostic, { needsSelectionIndex }]) =>
                needsSelectionIndex === undefined ? undefined : rangeToSelection(diagnostic.range),
            ),
        )
        if (codeActionsToSelect.length > 0) {
            editor.selections = codeActionsToSelect
        }

        for (const [codeFix, diagnostic, metadata] of selectedCodeFixes) {
            if (!codeFix) continue
            // eslint-disable-next-line no-await-in-loop
            const { edit } = (await applyCodeAction(diagnostic, codeFix, metadata)) ?? {}
            if (edit)
                for (const [uri, edits] of edit.entries()) {
                    mainWorkspaceEdit.set(uri, [...mainWorkspaceEdit.get(uri), ...edits])
                }
        }

        await vscode.workspace.applyEdit(mainWorkspaceEdit)

        // for (const { command, arguments: args = [] } of commands) void vscode.commands.executeCommand(command, ...args)

        async function applyCodeAction(diagnostic: vscode.Diagnostic, inputCodeAction: vscode.CodeAction, metadata: Metadata, retryCount = 1) {
            const { needsSelectionIndex, skipSelectionResetting } = metadata
            const newSelectionIndex = editor.selections.length - (codeActionsToSelect.length - (needsSelectionIndex ?? -1))
            const currentSelection = editor.selections[newSelectionIndex]
            if (needsSelectionIndex !== undefined && !skipSelectionResetting && currentSelection) {
                editor.selection = currentSelection
            }

            if (needsSelectionIndex)
                await new Promise(resolve => {
                    setTimeout(resolve, 0)
                })

            const codeAction = needsSelectionIndex
                ? await findDiagnosticFixes(editor.document.uri, diagnostic, currentSelection, inputCodeAction)
                : inputCodeAction

            if (!codeAction || (!codeAction.edit && !codeAction.command)) {
                if (retryCount < 2) {
                    console.log('no action, retrying', retryCount)
                    await new Promise(resolve => {
                        setTimeout(resolve, 100)
                    })
                    await applyCodeAction(diagnostic, inputCodeAction, metadata, ++retryCount)
                    return
                }

                throw new Error(`Diagnostic ${diagnostic.message} has no code action (action)`)
            }

            const { edit, command } = codeAction
            if (edit && command) await vscode.commands.executeCommand(command.command, ...(command.arguments ?? []))
            if (edit) return { edit }
            if (!command) return
            const activeEditor = vscode.window.activeTextEditor!
            const disposables: vscode.Disposable[] = []
            // vscode.window.onDidChangeTextEditorSelection(({ textEditor, selections }) => {
            //                 if (activeEditor?.document.uri.toString() !== textEditor.document.uri.toString()) return
            //     if (selections.length === 0) {

            //     }
            // }, undefined, disposables)
            await Promise.all([
                vscode.commands.executeCommand(command.command, ...(command.arguments ?? [])),
                new Promise<void>(resolve => {
                    vscode.workspace.onDidChangeTextDocument(
                        ({ document, contentChanges }) => {
                            if (contentChanges.length === 0 || activeEditor.document.uri.toString() !== document.uri.toString()) return
                            resolve()
                        },
                        undefined,
                        disposables,
                    )
                }),
            ])
            vscode.Disposable.from(...disposables).dispose()
            // editor.selections = oldSelections

            // vscode.languages.onDidChangeDiagnostics(({ uris }) => {
            //     if (uris.some((uri) => activeEditor?.document.uri.toString() !== uri.toString())) {
            //         resolve()
            //         dispose()
            //     }
            // })

            return undefined
        }

        editor.selections = selections
    })

    registerExtensionCommand('fixHintDiagnostics', async () => {
        await vscode.commands.executeCommand(getExtensionCommandId('fixAllDiagnostics'), { severity: 'Hint' })
    })
}

async function findDiagnosticFixes(editorUri: vscode.Uri, diagnostic: vscode.Diagnostic, selection?: vscode.Selection, inputCodeAction?: vscode.CodeAction) {
    const codeActions: vscode.CodeAction[] = await vscode.commands.executeCommand(
        'vscode.executeCodeActionProvider',
        editorUri,
        selection ? selectionToRange(selection) : diagnostic.range,
        vscode.CodeActionKind.QuickFix.value,
        10,
    )
    const compareKey = diagnostic.code ? 'code' : 'message'
    return codeActions.find(({ diagnostics, kind, isPreferred, title }) => {
        if (inputCodeAction) return inputCodeAction.title === title
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        return diagnostics?.some(val => val[compareKey] === diagnostic[compareKey]) || kind?.contains(vscode.CodeActionKind.QuickFix) || isPreferred
    })
}
