import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    const autoIndentEmptyLine = getExtensionSetting('autoIndentEmptyLine')
    if (autoIndentEmptyLine === 'disabled') return
    vscode.window.onDidChangeTextEditorSelection(async ({ textEditor, selections, kind }) => {
        if (getActiveRegularEditor()?.document.uri !== textEditor.document.uri) return
        if (kind === undefined || kind === vscode.TextEditorSelectionChangeKind.Command) return
        if (!getExtensionSetting('autoIndentEmptyLineIfNotDirty') && !textEditor.document.isDirty) return
        if (autoIndentEmptyLine === 'mouse-only' && kind !== vscode.TextEditorSelectionChangeKind.Mouse) return
        const firstSelection = selections[0]!
        if (selections.length !== 1 || !firstSelection.start.isEqual(firstSelection.end) || firstSelection.start.character !== 0) return
        await vscode.commands.executeCommand('editor.action.reindentselectedlines')
    })
}
