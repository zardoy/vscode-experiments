import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { noCase } from 'change-case'
import { registerExtensionCommand } from 'vscode-framework'

// doesn't support multicursor
export const registerRenameVariableParts = () => {
    registerExtensionCommand('renameVariableParts', async () => {
        const activeEditor = getActiveRegularEditor()
        if (!activeEditor) return
        const quickPick = vscode.window.createQuickPick()
        const { document } = activeEditor
        const wordRange = document.getWordRangeAtPosition(activeEditor.selection.end)
        if (!wordRange) {
            await vscode.window.showWarningMessage('No word range at position')
            return
        }

        const parts: Array<{ part: string; index: number }> = []
        noCase(document.getText(wordRange), {
            transform(part, index) {
                parts.push({ part, index })
                return ''
            },
        })

        let editingIndex: number | undefined
        const updateItems = () => {
            quickPick.items = parts.map(part => ({ label: part.part, index: part.index }))
        }

        updateItems()

        const updateTitle = () => {
            quickPick.title = `Rename variable parts: ${quickPick.items.map(({ label }) => label).join('')}`
        }

        updateTitle()
        // quickPick.onDidChangeActive(([item]) => {
        //     quickPick.value = item!.label
        // })
        quickPick.onDidChangeValue(() => {
            updateTitle()
            quickPick.activeItems = [quickPick.items[1]!]
        })
        quickPick.onDidAccept(() => {
            const activeItem = quickPick.activeItems[0]!
            if (editingIndex === undefined) {
                editingIndex = quickPick.items.indexOf(activeItem)
                quickPick.items = [{ label: quickPick.items[editingIndex]!.label }]
            } else {
                // TODO! update index!
                updateItems()
            }
        })
        quickPick.show()
        quickPick.onDidHide(quickPick.dispose)
        // vscode.commands.executeCommand('')
    })
}
