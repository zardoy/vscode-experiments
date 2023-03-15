import * as vscode from 'vscode'

import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('formatSelectedOnly'), async (textEditor, _edit, textEditorExtension, _selections) => {
        const { selection } = textEditor
        // vscode Format Selection command doesn't force ranges to be within selection, but this command does
        const edits: vscode.TextEdit[] | undefined = await vscode.commands.executeCommand(
            'vscode.executeFormatRangeProvider',
            textEditor.document.uri,
            selection,
        )
        if (!edits) return
        const workspaceEdit = new vscode.WorkspaceEdit()
        workspaceEdit.set(
            textEditor.document.uri,
            edits.filter(edit => selection.contains(edit.range)),
        )
        await vscode.workspace.applyEdit(workspaceEdit)
    })
}
