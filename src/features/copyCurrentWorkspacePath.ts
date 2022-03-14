import * as vscode from 'vscode'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { registerExtensionCommand } from 'vscode-framework'

export const registerCopyCurrentWorkspacePath = () => {
    registerExtensionCommand('copyCurrentWorkspacePath', async () => {
        await vscode.env.clipboard.writeText(getCurrentWorkspaceRoot().uri.fsPath)
    })
}
