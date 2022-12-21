import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const openLocationsInView = async (references?: vscode.Location[]) => {
    const { activeTextEditor } = vscode.window
    if (!activeTextEditor) return
    const {
        document: { uri },
        selection: { active: position },
    } = activeTextEditor
    const result: vscode.Location[] = references ?? (await vscode.commands.executeCommand('vscode.executeReferenceProvider', uri, position))
    if (!result) return

    // chill https://github.com/microsoft/vscode/blob/main/extensions/typescript-language-features/src/languageFeatures/fileReferences.ts#L69
    const config = vscode.workspace.getConfiguration('references')
    const existingSetting = config.inspect<string>('preferredLocation')

    await config.update('preferredLocation', 'view')
    try {
        await vscode.commands.executeCommand('editor.action.showReferences', uri, new vscode.Position(0, 0), result)
    } finally {
        await config.update('preferredLocation', existingSetting?.workspaceFolderValue ?? existingSetting?.workspaceValue)
    }
}

export default () => {
    registerExtensionCommand('openReferencesInView', async () => openLocationsInView())
}
