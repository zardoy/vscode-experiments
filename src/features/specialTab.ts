import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { notSingleSursor } from '../codeActions'

// TODO alt+cmd+backspace rm casePart
export const registerAlwaysTab = () => {
    registerExtensionCommand('tab', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) throw new Error('no activeTextEditor')
        if (notSingleSursor()) return
        const pos = activeTextEditor.selection.start
        const { document, selection } = activeTextEditor
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

        if (pos.character === 0) {
            if (lineText !== '' && lineText.trim() === '')
                await activeTextEditor.edit(builder => builder.delete(new vscode.Range(pos, pos.with({ character: lineText.length }))), {
                    undoStopAfter: false,
                    undoStopBefore: false,
                })
            await vscode.commands.executeCommand('editor.action.reindentselectedlines')
            return
        }

        let currentIndent = document.lineAt(pos).firstNonWhitespaceCharacterIndex
        // would never run
        if (currentIndent === 0) await vscode.commands.executeCommand('tab')
        else
            for (let i = pos.line; i >= 0; i--) {
                const line = document.lineAt(i)
                const lineText = line.text
                const nextIndent = line.firstNonWhitespaceCharacterIndex
                // skip empty lines
                if (lineText === '') continue
                // console.log(i + 1, currentIndent, nextIndent)
                if (i !== pos.line && nextIndent >= currentIndent) continue
                // console.log(i + 1, 'text', lineText)
                if (nextIndent < currentIndent) currentIndent = nextIndent
                // TODO! matches only first fn on the line, but should I care?
                const match = /(\([^()]*)\)(?:: .+)? (?:=>|{)/.exec(lineText)
                if (match) {
                    const newPos = new vscode.Position(i, match.index + (match[1]?.length ?? match[2]!.length))
                    if (selection.end.isEqual(newPos)) continue
                    activeTextEditor.selections = [new vscode.Selection(newPos, newPos)]
                    activeTextEditor.revealRange(selection)
                    return
                }
            }
    })
}
