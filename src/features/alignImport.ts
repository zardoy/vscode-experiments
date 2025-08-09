import * as vscode from 'vscode'
import { range } from 'rambda'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { defaultJsSupersetLangs } from '@zardoy/vscode-utils/build/langs'

export default () => {
    // TODO doesn't work with line-delimited imports
    const alignImport = async () => {
        const editor = vscode.window.activeTextEditor
        if (editor?.viewColumn === undefined || !defaultJsSupersetLangs.includes(editor.document.languageId)) return

        let metImportStatement = false
        let isInImport = false
        for (const lineIndex of range(0, editor.document.lineCount)) {
            const line = editor.document.lineAt(lineIndex).text
            if (line.startsWith('import')) {
                isInImport = true
                metImportStatement = true
            }

            if (line.includes('from ')) {
                isInImport = false
                continue
            }

            if (isInImport) continue
            // eslint-disable-next-line no-await-in-loop
            if (metImportStatement && line.trim() !== '') await editor.edit(builder => builder.insert(new vscode.Position(lineIndex, 0), '\n'))
            break
        }
    }

    registerExtensionCommand('addNewLineAfterImports', async () => {
        await alignImport()
    })

    vscode.workspace.onWillSaveTextDocument(({ waitUntil }) => {
        if (!getExtensionSetting('features.autoAlignImport')) return
        waitUntil(alignImport())
    })
}
