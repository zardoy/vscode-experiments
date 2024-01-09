import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('stylexSnippet', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        let { line } = editor.selection.active
        let regexMatch
        const predicateRegex = /const ([\w\d]+) = stylex.create\({/i
        while (line > 0) {
            const { text } = editor.document.lineAt(line)
            if (predicateRegex.test(text)) {
                regexMatch = predicateRegex.exec(text)![1]!
                break
            }

            line--
        }

        if (!regexMatch) return
        const insideProps = editor.document.lineAt(editor.selection.active).text.includes('...stylex.props')
        const snippet = insideProps
            ? new vscode.SnippetString().appendText(`${regexMatch}.`)
            : new vscode.SnippetString().appendText(`{...stylex.props(${regexMatch}.`).appendTabstop(0).appendText(')}')

        await editor.insertSnippet(snippet)
        await vscode.commands.executeCommand('editor.action.triggerSuggest')
    })
}
