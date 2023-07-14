import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('addImport', async () => {
        // for TS files only
        // TODO this command will be removed from here in favor of TS plugin
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return
        let insertLine = 0
        for (const [index, line] of editor.document.getText().split('\n').entries()) {
            if (/^(#|\/\/|\/\*)/.test(line)) continue
            insertLine = index
            break
        }
        // const nextImportIndex = /^(?!import)/m.exec(editor.document.getText())?.index ?? 0
        // let nextImportLine = 1
        // let lineIndex = 0
        // for (const line of editor.document.getText().split('\n')) {
        //     lineIndex++
        //     if (line.startsWith('import')) continue
        //     nextImportLine = lineIndex - 1
        //     break
        // }

        const currentPos = editor.selection.start
        void editor.insertSnippet(new vscode.SnippetString("import { $2 } from '$1'\n"), new vscode.Position(insertLine, 0))
        const { dispose } = vscode.window.onDidChangeTextEditorSelection(({ selections, textEditor }) => {
            if (textEditor.document.uri !== editor.document.uri) return
            const pos = selections[0]!.start
            if (pos.line !== insertLine) dispose()
            const pos2 = new vscode.Position(insertLine, textEditor.document.lineAt(insertLine).text.length)
            if (!pos.isEqual(new vscode.Position(insertLine + 1, 0)) && !pos.isEqual(pos2)) return

            // looses selections and mutl-selections
            editor.selection = new vscode.Selection(currentPos.translate(1), currentPos.translate(1))
            editor.revealRange(editor.selection)
        })
    })
}
