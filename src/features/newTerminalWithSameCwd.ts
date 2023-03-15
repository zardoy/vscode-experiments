import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('newTerminalWithSameCwd', async () => {
        if (process.env.PLATFORM === 'node') {
            const { default: pidCwd } = await import('pid-cwd')
            const processId = await vscode.window.activeTerminal?.processId
            if (!processId) return
            const cwd = await pidCwd(processId)
            if (!cwd) {
                void vscode.window.showWarningMessage("Can't get cwd of active terminal")
                return
            }

            vscode.window.createTerminal().sendText(`cd "${cwd}"`, true)
        } else {
            void vscode.window.showWarningMessage('not supported in web')
        }
    })
}
