import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('typeDecorations.enable')) return
    const enableLanguages = getExtensionSetting('typeDecorations.languages')
    const decoration = vscode.window.createTextEditorDecorationType({
        after: {
            // https://code.visualstudio.com/api/references/theme-color#editor-colors
            color: new vscode.ThemeColor('editorGhostText.foreground'),
            // contentText: typeString,
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })
    const checkDecorations = async ({ textEditor: editor }: { textEditor?: vscode.TextEditor } = {}): Promise<void> => {
        const textEditor = vscode.window.activeTextEditor
        if (
            !textEditor ||
            (editor && textEditor.document.uri !== editor.document.uri) ||
            textEditor.viewColumn === undefined ||
            !vscode.languages.match(enableLanguages, textEditor.document)
        )
            return
        const { selections } = textEditor
        const pos = selections[0]!.end
        const { document } = textEditor
        const text = document.lineAt(pos).text.slice(0, pos.character)
        const match = /(:| =) $/.exec(text)
        textEditor.setDecorations(decoration, [])
        if (!match) return
        const offset = match[0]!.length
        const hoverData: vscode.Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, pos.translate(0, -offset))
        let typeString: string | undefined
        for (const hover of hoverData) {
            const hoverString = hover.contents
                .map(content => {
                    if (typeof content === 'object') return content.value
                    return content
                })
                .join('')
            const typeMatch = /: (.+)/.exec(hoverString)
            if (!typeMatch) continue
            typeString = typeMatch[1]!
            break
        }

        if (!typeString) return
        textEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos.translate(0, -1), pos),
                renderOptions: {
                    after: {
                        contentText: typeString,
                    },
                },
            },
        ])
    }

    void checkDecorations()
    vscode.window.onDidChangeTextEditorSelection(checkDecorations)
}
