import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'

export const registerRenameFileParts = () => {
    registerExtensionCommand('renameFileParts', async () => {
        void vscode.commands.executeCommand(getExtensionCommandId('renameVariableParts'), 'fileName')
    })
}
