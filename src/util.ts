import * as vscode from 'vscode'

export const noWebSupported = () => {
    void vscode.window.showWarningMessage('This command is not supported in the web')
}
