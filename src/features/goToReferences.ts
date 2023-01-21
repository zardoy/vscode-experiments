import * as vscode from 'vscode'

// fixed variant of builtin Go To References command that maintains focus on current reference
// but goes from definition

import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('goToReferences', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const {
            document: { uri },
            selection: { active: position },
        } = activeTextEditor
        const result: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', uri, position)
        if (!result) return

        const currentLocation = result.find(location => location.range.contains(position))
        await vscode.commands.executeCommand('editor.action.showReferences', uri, (currentLocation ?? result[0])?.range.start, result)
    })
}
