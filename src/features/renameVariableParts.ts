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
            const firstCharacterEqual = parts[0]?.[0]?.[ensureMethod]() === parts[0]?.[0]

            if (!firstCharacterEqual) parts[0] = `${parts[0]![0]![ensureMethod]()}${parts[0]!.slice(1)}`
            quickPick.items = parts.map(part => ({ label: part }))
            quickPick.title = `Rename variable parts: ${quickPick.items.map(({ label }) => label).join('')}`
        }

        const upperCaseFirstLetter = (part: string) => `${part[0]!.toUpperCase()}${part.slice(1)}`

        resetItems()

        const moveVariableParts = (direction: 'up' | 'down') => {
            const currentActiveItemIndex = quickPick.items.indexOf(quickPick.activeItems[0]!)
            const currentPart = parts[currentActiveItemIndex]!
            if (direction === 'up') {
                const prevPart = parts[currentActiveItemIndex - 1]!
                if (!prevPart) return
                const normallizedPart = currentActiveItemIndex === 1 ? upperCaseFirstLetter(prevPart) : prevPart
                parts.splice(currentActiveItemIndex - 1, 1, currentPart)
                parts.splice(currentActiveItemIndex, 1, normallizedPart)
            }

            if (direction === 'down') {
                const nextPart = parts[currentActiveItemIndex + 1]
                if (!nextPart) return
                const normallizedPart = currentActiveItemIndex === 0 ? upperCaseFirstLetter(currentPart) : currentPart
                parts.splice(currentActiveItemIndex + 1, 1, normallizedPart)
                parts.splice(currentActiveItemIndex, 1, nextPart)
            }

            resetItems()
            quickPick.activeItems = quickPick.items.filter(({ label }) => label.toLowerCase() === currentPart.toLowerCase())
        }

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
                moveVariableParts('up')
            }),
            registerCommand('renameVariablePartsPartMoveDown', () => {
                moveVariableParts('down')
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
