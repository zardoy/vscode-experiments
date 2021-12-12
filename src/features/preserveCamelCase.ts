import vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export const preserveCamelCase = () => {
    if (!getExtensionSetting('features.preserveCamelCase')) return
    const lastCharPos: Record<string, { char: string; pos: vscode.Position }> = {}
    vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.textEditor.viewColumn === undefined) return
        const pos = e.selections[0].start
        const uriKey = e.textEditor.document.uri.toString()

        const lastPos = lastCharPos[uriKey]
        if (lastPos) {
            const replaceRange = new vscode.Range(pos, pos.translate(0, 1))
            // TODO detect actual shift
            if (lastPos.pos.translate(0, 1).isEqual(pos) && e.textEditor.document.getText(replaceRange) === lastPos.char)
                void e.textEditor.edit(
                    builder => {
                        builder.replace(replaceRange, lastPos.char.toUpperCase())
                    },
                    {
                        undoStopAfter: false,
                        undoStopBefore: false,
                    },
                )

            lastCharPos[uriKey] = undefined
            return
        }

        if (
            e.kind === undefined ||
            !e.selections[0].start.isEqual(e.selections[0].end) ||
            // TODO
            e.selections.length !== 1
        )
            return

        const text = e.textEditor.document.getText(new vscode.Range(new vscode.Position(pos.line, 0), pos.translate(0, 1)))
        const match = /.*(const|let) (\w)$/.exec(text)
        if (!match) return
        // TODO! match with url
        lastCharPos[uriKey] = {
            char: match[2]!,
            pos,
        }
    })
}
