import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('fixedSurroundIf', async () => {
        await vscode.commands.executeCommand('expandLineSelection')
        await vscode.commands.executeCommand('surround.with')
    })
}
