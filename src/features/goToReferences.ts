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
        let locations: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', uri, position)
        locations ??= []

        const hasLocationInPos = locations.some(location => location.range.contains(position))
        await vscode.commands.executeCommand(
            'editor.action.goToLocations',
            uri,
            hasLocationInPos ? position : locations[0]?.range.start ?? position,
            locations,
            vscode.workspace.getConfiguration('editor').get('gotoLocation.multipleReferences') ?? 'peek',
            'No references',
        )
    })
}
