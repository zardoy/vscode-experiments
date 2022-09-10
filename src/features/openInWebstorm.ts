import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { noWebSupported } from '../util'

export const registerOpenInWebstorm = () => {
    registerExtensionCommand('openFileInWebstorm', async () => {
        if (process.env.PLATFORM === 'web') {
            noWebSupported()
        } else {
            const activeEditor = vscode.window.activeTextEditor
            if (!activeEditor || activeEditor.viewColumn === undefined) return
            const currentPos = activeEditor.selection.end

            const { execa } = await import('execa')
            await execa('webstorm', ['--line', currentPos.line + 1, '--column', currentPos.character, activeEditor.document.uri.fsPath].map(String))
        }
    })
}
