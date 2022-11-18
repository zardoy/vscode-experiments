import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { makeOutlineChainFromPos } from '@zardoy/vscode-utils/build/outline'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyCurrentOutlinePath', async (_, delimeter?: string) => {
        const editor = getActiveRegularEditor()
        if (!editor) return
        const outlineItems: vscode.DocumentSymbol[] = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri)
        if (!outlineItems) return
        const outlinePath = makeOutlineChainFromPos(outlineItems, editor.selection.active).map(({ name }) => name)
        if (outlinePath.length === 0) {
            void vscode.window.showInformationMessage('Outline path is empty')
            return
        }

        delimeter ??= await vscode.window.showInputBox({
            title: 'Enter delimeter',
            placeHolder: 'Special values: ts',
        })
        if (!delimeter) return
        const textToCopy = delimeter === 'ts' ? outlinePath.map(x => `["${x.replaceAll('"', '\\"')}"]`).join('') : outlinePath.join(delimeter)
        await vscode.env.clipboard.writeText(textToCopy)
    })
}
