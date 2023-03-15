import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('toggleExtHostOutput', async () => {
        await vscode.commands.executeCommand('workbench.output.action.switchBetweenOutputs', 'extHostLog')
    })
}
