import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'

export const selectLineContents = () => {
    const activeEditor = getActiveRegularEditor()
    if (!activeEditor) return
    const { document, selections } = activeEditor
    const newSelections: vscode.Selection[] = []
    for (const selection of selections) {
        const line = document.lineAt(selection.end)
        // TODO support different lines selection range
        const startPos = new vscode.Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex)
        // TODO selection doesn't work with Infinite position, but Range does
        newSelections.push(new vscode.Selection(startPos, line.range.end))
    }

    return newSelections
}

export default () => {
    // doesn't expand on second execution
    registerExtensionCommand('selectLineContents', () => {
        const activeEditor = getActiveRegularEditor()
        const newSelections = selectLineContents()
        if (!newSelections) return
        activeEditor!.selections = newSelections
    })
}
