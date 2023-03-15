import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyWorkspaceName', async () => {
        const workspaceName = vscode.workspace.name
        if (!workspaceName) return
        await vscode.env.clipboard.writeText(workspaceName)
    })
}
