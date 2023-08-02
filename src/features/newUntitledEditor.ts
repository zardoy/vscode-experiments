import * as vscode from 'vscode'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

// opinionated untitled editors creation
export default () => {
    registerExtensionCommand('newUntitledEditor', async () => {
        const selected = await showQuickPick(getExtensionSetting('newUntitledEditor.suggestLanguages').map(x => ({ label: x, value: x })))
        if (!selected) return
        // open untitled editor with lang
        const doc = await vscode.workspace.openTextDocument({ language: selected.includes(':') ? selected.slice(selected.indexOf(':') + 1) : selected })
        await vscode.window.showTextDocument(doc)
    })
}
