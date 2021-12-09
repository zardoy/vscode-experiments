import vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerFixCss = () => {
    const fixCss = async () => {
        const editor = vscode.window.activeTextEditor
        if (editor === undefined || editor.viewColumn === undefined || !['scss', 'sass', 'css'].includes(editor.document.languageId)) return

        // exit early to save extra time on huge documents
        if (vscode.languages.getDiagnostics(editor.document.uri).length === 0) return
        await editor.edit(builder => {
            for (const [lineNumber, lineTextRaw] of editor.document.getText().split('\n').entries()) {
                let lineText = lineTextRaw.trim()
                if (lineText === '' || ['@', "'", '"'].some(char => lineText.startsWith(char)) || '{ }'.split(' ').some(char => lineText.endsWith(char)))
                    continue
                console.log('pass', lineNumber)
                // fix copy-pasted css-in-js
                const endPos = new vscode.Position(lineNumber, editor.document.lineAt(lineNumber).firstNonWhitespaceCharacterIndex + lineText.length)
                if (lineText.endsWith(',')) {
                    builder.delete(new vscode.Range(endPos.translate(0, -1), endPos))
                    lineText = lineText.slice(0, -1)
                }

                if (!lineText.endsWith(';')) builder.insert(endPos, ';')
                // ? https://github.com/cssinjs/jss/blob/359b55916cbc15653a3ca052841296bcd325bc86/packages/jss/src/utils/toCssValue.js
                const d = /.+:.+;?/
            }
        })
    }

    registerExtensionCommand('fixCss', fixCss)
}
