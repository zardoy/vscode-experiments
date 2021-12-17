import * as vscode from 'vscode'
import { range } from 'rambda'

export const registerAutoAlignImport = () => {
    // TODO doesn't work with line-delimited imports
    const alignImport = async () => {
        const editor = vscode.window.activeTextEditor
        if (
            editor === undefined ||
            editor.viewColumn === undefined ||
            !['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(editor.document.languageId)
        )
            return

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
            if (metImportStatement && line.trim() !== '') await editor.edit(builder => builder.insert(new vscode.Position(lineIndex, 0), '\n'))
            break
        }
    }

    vscode.workspace.onWillSaveTextDocument(({ waitUntil }) => {
        waitUntil(alignImport())
    })
}
