import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerCopyVariableName = () => {
    registerExtensionCommand('copyLineVariableName', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        // also would make sense to support mutliple selections/cursors
        const lineText = activeEditor.document.lineAt(activeEditor.selection.end).text
        const regexps = [
            /\s*(?:const(?: {)?|let(?: {)?|type|interface|import(?: {)?|function) ([\w\d]+)/,
            /\s*(?:\.|(?:.*(?:class|className)=["']))([\w\d-]+?)\s*[{"']/,
        ]
        let varName: string | undefined
        for (const regexp of regexps) {
            varName = regexp.exec(lineText)?.[1]
            if (varName) break
        }

        if (!varName) {
            // TODO replaceDocumentation?: (str
            const match = /\s*(?:(?:['"](.+)['"])|(.+)):/.exec(lineText)
            varName = match?.[1] ?? match?.[2]
        }

        if (!varName) return
        await vscode.env.clipboard.writeText(varName)
    })
}

export const ate = () => {}
