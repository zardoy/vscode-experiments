import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export default () => {
    const enable = getExtensionSetting('enableExperimentalIntegrationsWithTsPlugin')
    if (!enable) return
    // escape ' before entered char
    registerExtensionCommand('ts.escapeIfInString' as any, async () => {
        const editor = getActiveRegularEditor()
        if (!editor) return
        const { document, selection } = editor
        // selection is one char behind the inserted char
        const posBefore = selection.active.translate(0, -1)
        const offset = document.offsetAt(posBefore)
        const getNormalizedNodeAtPosition = async (offset: number) => {
            const { kindName, start, end } = ((await vscode.commands.executeCommand('tsEssentialPlugins.getNodeAtPosition', { offset })) as any) ?? {}
            const endPos = document.positionAt(end)
            const startPos = document.positionAt(end)
            return {
                kindName,
                endPos,
                startPos,
                text: document.getText(new vscode.Range(document.positionAt(start), endPos)),
            }
        }

        const { kindName, text } = await getNormalizedNodeAtPosition(offset)
        if (kindName !== 'StringLiteral' || !(text.startsWith("'") && text.endsWith("'")) || text === "''") return
        await new Promise<void>(resolve => {
            const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document }) => {
                if (document.uri !== editor.document.uri) return
                resolve()
                dispose()
            })
            void editor.edit(builder => {
                builder.insert(posBefore, '\\')
            })
        })
        const { text: newText } = await getNormalizedNodeAtPosition(offset + 1)
        // unterminated string, let's fix it
        if (kindName === 'StringLiteral' && !newText.endsWith("'")) {
            await new Promise<void>(resolve => {
                // TODO refactor to vscode-utils
                // eslint-disable-next-line sonarjs/no-identical-functions
                const { dispose } = vscode.workspace.onDidChangeTextDocument(({ document }) => {
                    if (document.uri !== editor.document.uri) return
                    resolve()
                    dispose()
                })
                void editor.edit(
                    builder => {
                        builder.insert(editor.selection.active, "'")
                    },
                    { undoStopBefore: false, undoStopAfter: true },
                )
            })
            editor.selections = editor.selections.map(s => {
                const pos = s.active.translate(0, -1)
                return new vscode.Selection(pos, pos)
            })
        }
    })
}
