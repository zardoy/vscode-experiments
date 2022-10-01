import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('statusbarOccurrencesCount')) return
    const statusbar = vscode.window.createStatusBarItem('occurrencesCount')
    statusbar.name = 'Occurrences Count'
    const update = () => {
        const { activeTextEditor } = vscode.window
        let hide = true
        if (!activeTextEditor) return

        const { document, selection, selections } = activeTextEditor
        if (selection.start.isEqual(selection.end)) return
        const selectionText = document.getText(selection)
        if (selections.length > 1 && selections.some(selection => document.getText(selection) !== selectionText)) return
        // const allOccurrencesCount =
        statusbar.text = ''
        hide = false
        statusbar.show()
    }

    vscode.window.onDidChangeActiveTextEditor(update)
}
