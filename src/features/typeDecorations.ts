import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { getNormalizedVueOutline } from '@zardoy/vscode-utils/build/vue'
import { markdownToTxt } from 'markdown-to-txt'

export default () => {
    if (!getExtensionSetting('typeDecorations.enable')) return
    const enableLanguages = getExtensionSetting('typeDecorations.languages')
    const ignoreValues = getExtensionSetting('typeDecorations.ignoreValues')
    const decoration = vscode.window.createTextEditorDecorationType({
        after: {
            // https://code.visualstudio.com/api/references/theme-color#editor-colors
            color: new vscode.ThemeColor('editorGhostText.foreground'),
            // contentText: typeString,
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    })

    const checkIfInStyles = async (document: vscode.TextDocument, position: vscode.Position) => {
        const { languageId, uri } = document
        const stylesLangs = new Set(['scss', 'css', 'less', 'sass'])
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

    let _decorationToInsert = ''
    const setDecorationToInsert = (newText: string) => {
        _decorationToInsert = newText
        void vscode.commands.executeCommand('setContext', 'zardoyExperiments.typeDecoration', !!newText)
    }

    registerExtensionCommand('insertTypeDecoration', async () => {
        await vscode.commands.executeCommand('type', { text: _decorationToInsert })
    })

    // try to use native solution instead of vscode (custom)
    const inFlightOperations: AbortController[] = []
    // eslint-disable-next-line complexity
    const checkDecorations = async ({ textEditor: editor }: Partial<vscode.TextEditorSelectionChangeEvent> = {}): Promise<void> => {
        const textEditor = vscode.window.activeTextEditor
        if (
            !textEditor ||
            (editor && textEditor.document.uri !== editor.document.uri) ||
            textEditor.viewColumn === undefined ||
            !vscode.languages.match(enableLanguages, textEditor.document)
        )
            return
        for (const inFlightOperation of inFlightOperations) inFlightOperation.abort()
        inFlightOperations.splice(0, inFlightOperations.length)
        textEditor.setDecorations(decoration, [])
        setDecorationToInsert('')
        const {
            selections: [selection],
        } = textEditor
        if (!selection || !selection.isEmpty) return
        const pos = selection.end
        const { document } = textEditor
        const lineText = document.lineAt(pos).text
        const textBefore = lineText.slice(0, pos.character)
        const textAfter = lineText.slice(pos.character)
        const isInBannedPosition = /(const|let) (\w|\d)+ = $/i.test(textBefore)
        if (isInBannedPosition) return
        const match = /(:| =) $/.exec(textBefore)
        const alwaysMatch = / [!=]== $/.exec(textBefore)
        // if in destructure or object literal
        const endingMatch = /^\s*(}|]|;|,|$)/
        if (!alwaysMatch && (!match || !endingMatch.test(textAfter))) return
        const offset = (match ?? alwaysMatch)![0]!.length
        const controller = new AbortController()
        inFlightOperations.push(controller)
        // TODO: core support token!
        const isInStyles = await checkIfInStyles(document, pos)
        if (controller.signal.aborted) return
        if (isInStyles && !getExtensionSetting('typeDecorations.enableInStyles')) return
        const hoverData: vscode.Hover[] = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, pos.translate(0, -offset))
        if (controller.signal.aborted) return

        let typeString: string | undefined
        for (const hover of hoverData) {
            const hoverString = hover.contents
                .map(content => {
                    if (typeof content === 'object') return content.value
                    return content
                })
                .join('')
            const typeMatch = isInStyles ? /Syntax: (.*)/.exec(hoverString) : /: (.+)/.exec(hoverString)
            if (!typeMatch) continue
            typeString = markdownToTxt(typeMatch[1]!)
            break
        }

        if (!typeString || typeString === '{' || ignoreValues.includes(typeString)) return
        const STRING_LENGTH_LIMIT = 60
        const decorationText = typeString.slice(0, STRING_LENGTH_LIMIT)
        setDecorationToInsert(decorationText)
        textEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos.translate(0, -1), pos),
                renderOptions: {
                    after: {
                        contentText: decorationText,
                    },
                },
            },
        ])
    }

    void checkDecorations()
    vscode.window.onDidChangeTextEditorSelection(checkDecorations)
}
