import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { getNormalizedVueOutline } from '@zardoy/vscode-utils/build/vue'

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

    const checkIfInStyles = async (document: vscode.TextDocument, position: vscode.Position) => {
        const {languageId, uri} = document
        const stylesLangs = new Set(['scss', 'css', 'less', 'sass'])
        console.log('stylesLangs.includes(languageId)', stylesLangs.has(languageId))
        if (stylesLangs.has(languageId)) return true
        if (languageId === 'vue') {
            const outline = await getNormalizedVueOutline(uri)
            if (!outline) {
                console.warn('No default vue outline. Install Volar or Vetur')
                return true
            }

            const style = outline.find(item => item.name === 'style')
            if (style?.range.contains(position)) return true
            return false
        }

        return false
    } 

    const checkDecorations = async ({ textEditor: editor }: { textEditor?: vscode.TextEditor } = {}): Promise<void> => {
        const textEditor = vscode.window.activeTextEditor
        if (
            !textEditor ||
            (editor && textEditor.document.uri !== editor.document.uri) ||
            textEditor.viewColumn === undefined ||
            !vscode.languages.match(enableLanguages, textEditor.document)
        )
            return
        const { selections, document } = textEditor
        const pos = selections[0]!.end
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

        const isInStyles = await checkIfInStyles(document, pos)
        if (!typeString || typeString === '{'|| isInStyles) return
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
