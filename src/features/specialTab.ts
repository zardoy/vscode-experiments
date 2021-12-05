import vscode from 'vscode'
import { registerActiveDevelopmentCommand, registerExtensionCommand } from 'vscode-framework'
import { notSingleSursor } from '../codeActions'

// TODO alt+cmd+backspace rm casePart
export const registerAlwaysTab = async () => {
    registerExtensionCommand('tab', () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) throw new Error('no activeTextEditor')
        if (notSingleSursor()) return
        const pos = activeTextEditor.selection.start
        const { document } = activeTextEditor
        const lineText = document.lineAt(pos).text
        const matchImport = /(import .*from )(['"].*['"])/.exec(lineText)
        if (matchImport) {
            const specifierRange = new vscode.Range(pos.with(undefined, matchImport[1]!.length), pos.with(undefined, lineText.length))
            const inSpec = specifierRange.intersection(new vscode.Range(pos, pos))
            let newChar: number
            if (inSpec) {
                const symbIndex = matchImport[1]!.length - 7
                const endIndent = lineText[symbIndex]
                newChar = endIndent === '}' ? symbIndex - 1 : symbIndex + 1
            } else {
                newChar = lineText.length - 1
            }

            const newPos = pos.with(undefined, newChar)
            activeTextEditor.selections = [new vscode.Selection(newPos, newPos)]
            return
        }
        // vscode.languages.registerOnTypeFormattingEditProvider('typescript', {
        //     provideOnTypeFormattingEdits(document, position, ch, options, token) {

        //     }
        // })

        let currentIndent = document.lineAt(pos).firstNonWhitespaceCharacterIndex
        if (currentIndent !== 0)
            for (let i = pos.line; i >= 0; i--) {
                const line = document.lineAt(i)
                const lineText = line.text
                const nextIndent = line.firstNonWhitespaceCharacterIndex
                // skip empty lines
                if (lineText === '') continue
                // console.log(i + 1, currentIndent, nextIndent)
                if (nextIndent >= currentIndent) continue
                // console.log(i + 1, 'text', lineText)
                if (nextIndent < currentIndent) currentIndent = nextIndent
                // TODO! matches only first fn on the line, but should I care?
                const match = /(?:(\([^()]*)\)|(\w+))(?:: .+)? =>/.exec(lineText)
                if (match) {
                    const newPos = new vscode.Position(i, match.index + (match[1]?.length ?? match[2]!.length))
                    if (activeTextEditor.selection.end.isEqual(newPos)) continue
                    activeTextEditor.selections = [new vscode.Selection(newPos, newPos)]
                    activeTextEditor.revealRange(activeTextEditor.selection)
                    return
                }
                // if (i === pos.line) {

                // }
            }

        // TODO remove it from here
    })
    await vscode.commands.executeCommand('tab')
}
