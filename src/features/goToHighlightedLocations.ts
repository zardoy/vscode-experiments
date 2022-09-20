import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('goToHighlightedLocations', async (_, { goToMode } = {}) => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const highlights: vscode.DocumentHighlight[] =
            (await vscode.commands.executeCommand('vscode.executeDocumentHighlights', activeTextEditor.document.uri, activeTextEditor.selection.active)) ?? []
        if (!highlights?.length) return
        const {
            document: { uri },
        } = vscode.window.activeTextEditor!
        const locations: vscode.Location[] = highlights.map(({ range }) => new vscode.Location(uri, range))
        if (!goToMode) goToMode = vscode.workspace.getConfiguration('editor').get('gotoLocation.multipleReferences') ?? 'peek'
        await vscode.commands.executeCommand('editor.action.peekLocations', uri, activeTextEditor.selection.active, locations, goToMode)
    })
}
