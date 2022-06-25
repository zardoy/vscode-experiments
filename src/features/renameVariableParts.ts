import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { noCase } from 'change-case'
import { getExtensionContributionsPrefix, registerExtensionCommand, RegularCommands } from 'vscode-framework'

// doesn't support multicursor
export const registerRenameVariableParts = () => {
    registerExtensionCommand('renameVariableParts', async () => {
        const activeEditor = getActiveRegularEditor()
        if (!activeEditor) return

        const quickPick = vscode.window.createQuickPick()
        const { document, selection } = activeEditor
        const editRange = selection.isEmpty ? document.getWordRangeAtPosition(selection.end) : selection
        if (!editRange || editRange.isEmpty) {
            await vscode.window.showWarningMessage('No word range at position')
            return
        }

        // TODO make reactive via valtio
        const parts: string[] = []
        noCase(document.getText(editRange), {
            transform(part, index) {
                parts.push(part)
                return ''
            },
        })

        let editingIndex: number | undefined

        const getName = () => parts.join('')

        const isPascalCase = parts[0]![0]!.toUpperCase() === parts[0]![0]
        
        const resetItems = () => {
            editingIndex = undefined
            // preserve original casing
            const ensureMethod = isPascalCase ? 'toUpperCase' : 'toLowerCase'
            const wordPartsEqual = parts[0]?.[0]?.[ensureMethod]() === parts[0]?.[0]
            
            if (!wordPartsEqual) parts[0] = `${parts[0]![ensureMethod]()}${parts[0]!.slice(1)}`
            quickPick.items = parts.map(part => ({ label: part }))
            quickPick.title = `Rename variable parts: ${quickPick.items.map(({ label }) => label).join('')}`
        }

        resetItems()
        
        const registerCommand = (command: keyof RegularCommands, handler: () => void) =>
            vscode.commands.registerCommand(`${getExtensionContributionsPrefix()}${command}`, handler)

        const mainDisposable = vscode.Disposable.from(
            quickPick,
            registerCommand('renameVariablePartsAcceptDeletePart', () => {
                if (parts.length === 0) return
                parts.splice(editingIndex ?? quickPick.items.indexOf(quickPick.activeItems[0]!), 1)
                resetItems()
            }),
            registerCommand('renameVariablePartsAcceptExtractPart', () => {
                if (parts.length === 0) return
                const onlyPart = parts[editingIndex ?? quickPick.items.indexOf(quickPick.activeItems[0]!)]!
                parts.splice(0, parts.length)
                parts.push(onlyPart)
                resetItems()
            }),
            registerCommand('renameVariablePartsPartMoveUp', () => {
                console.log(editingIndex)
                if (editingIndex === undefined) return

                parts.splice(editingIndex - 1, 1, 'test')
                parts.splice(editingIndex, 1, 'test2')
                resetItems()
            }),
            registerCommand('renameVariablePartsPartMoveDown', () => {
                console.log(editingIndex)
                if (editingIndex === undefined) return

                parts.splice(editingIndex - 1, 1, 'test1')
                parts.splice(editingIndex, 1, 'test2')
                resetItems()
            }),
            registerCommand('renameVariablePartsAccept', async () => {
                quickPick.hide()
                const edit: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                    'vscode.executeDocumentRenameProvider',
                    document.uri,
                    selection.end,
                    getName(),
                )
                await vscode.workspace.applyEdit(edit)
            }),
            registerCommand('renameVariablePartsAcceptReplace', () => {
                void activeEditor.edit(builder => {
                    builder.replace(editRange, getName())
                })
                quickPick.hide()
            }),
            {
                dispose() {
                    void vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', false)
                },
            },
        )
        quickPick.onDidAccept(() => {
            const activeItem = quickPick.activeItems[0]!
            if (editingIndex === undefined) {
                editingIndex = quickPick.items.indexOf(activeItem)
                const { label } = activeItem
                quickPick.items = [
                    /* { label } */
                ]
                quickPick.value = label
                return
            }

            parts.splice(editingIndex, 1, quickPick.value)
            resetItems()
            quickPick.value = ''
        })
        quickPick.onDidHide(() => {
            mainDisposable.dispose()
        })
        await vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', true)
        quickPick.show()
        // vscode.commands.executeCommand('')
    })
}
