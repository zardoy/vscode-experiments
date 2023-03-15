import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('statusbarOccurrencesCount')) return
    const statusbar = vscode.window.createStatusBarItem('occurrencesCount', vscode.StatusBarAlignment.Right, 1000)
    statusbar.name = 'Occurrences Count'
    const update = () => {
        let hide = true
        try {
            const { activeTextEditor } = vscode.window
            if (!activeTextEditor) return

            const { document, selection, selections } = activeTextEditor
            if (selection.start.isEqual(selection.end)) return
            const selectionText = document.getText(selection)
            if (selections.length > 1 && selections.some(selection => document.getText(selection) !== selectionText)) return
            const allOccurrencesCount = document.getText().split(selectionText).length - 1
            statusbar.text = `E ${allOccurrencesCount}`
            hide = false
            statusbar.show()
        } finally {
            if (hide) statusbar.hide()
        }
    }

    vscode.window.onDidChangeActiveTextEditor(update)
    vscode.window.onDidChangeTextEditorSelection(({ textEditor }) => {
        if (textEditor.document.uri !== vscode.window.activeTextEditor?.document.uri) return
        update()
    })
    update()
}
