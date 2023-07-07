import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('toggleVueSemanticServerOutput', async () => {
        await vscode.commands.executeCommand('workbench.output.action.switchBetweenOutputs', 'extension-output-Vue.volar-#1-Vue Semantic Server')
    })
}
