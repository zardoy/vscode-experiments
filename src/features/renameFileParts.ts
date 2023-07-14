import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('renameFileParts', async () => {
        void vscode.commands.executeCommand(getExtensionCommandId('renameVariableParts'), 'fileName')
    })
}
