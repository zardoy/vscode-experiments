import vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerFixedSurroundIf = () => {
    registerExtensionCommand('fixedSurroundIf', async () => {
        await vscode.commands.executeCommand('expandLineSelection')
        await vscode.commands.executeCommand('surround.with')
    })
}
