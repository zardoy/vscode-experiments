import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerCopyVariableName = () => {
    registerExtensionCommand('copyLineVariableName', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        // also would make sense to support mutliple selections/cursors
        let varName: string | undefined
        const lineText = activeEditor.document.lineAt(activeEditor.selection.end).text
        const constName = /\s*(?:const|let|type|interface) ([\w\d]+)/.exec(lineText)?.[1]
        varName = constName
        if (!varName) {
            const match = /\s*(?:(?:['"](.+)['"])|(.+)):/.exec(lineText)
            varName = match?.[1] ?? match?.[2]
        }

        if (!varName) return
        await vscode.env.clipboard.writeText(varName)
    })
}
