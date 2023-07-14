import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { selectLineContents } from './selectLineContents'

// TODO extension
export const cutLineContents = async (preserve: boolean) => {
    const activeEditor = getActiveRegularEditor()!
    const newSelections = selectLineContents()
    if (!newSelections) return

    const { document } = activeEditor
    let textToCopy = ''
    for (const selection of newSelections) textToCopy += `${document.getText(selection)}\n`

    // preserve trailing whitespaces
    textToCopy = textToCopy.slice(0, -1)
    await vscode.env.clipboard.writeText(textToCopy)
    if (preserve) {
        await activeEditor.edit(builder => {
            for (const selection of newSelections) builder.delete(selection)
        })
    } else {
        // TODO support multicursor!
        const firstLine = newSelections[0]?.end.line
        const isSurroundedByNewlines =
            firstLine !== undefined &&
            [-1, 1].every(diff => {
                const lineNum = firstLine + diff
                if (lineNum === document.lineCount) return false
                // Whether we should do the same for the last line?
                if (lineNum === -1) return true
                return document.lineAt(lineNum).isEmptyOrWhitespace
            })
        await vscode.commands.executeCommand('editor.action.deleteLines')
        // TODO use range editing
        if (getExtensionSetting('dontLeaveEmptyLines') && isSurroundedByNewlines) await vscode.commands.executeCommand('editor.action.deleteLines')
    }
}

export default () => {
    registerExtensionCommand('cutLineContents', async () => cutLineContents(false))
}
