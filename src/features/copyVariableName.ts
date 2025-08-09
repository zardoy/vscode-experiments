import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyLineVariableName', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (activeEditor?.viewColumn === undefined) return
        // also would make sense to support mutliple selections/cursors
        const lineText = activeEditor.document.lineAt(activeEditor.selection.end).text
        const regexps = {
            variableNameRegex: /\s*(?:const(?: {)?|let(?: {)?|type|interface|import(?: {)?|function) ([\w\d]+)/,
            classContentRegex: /\s*(?:\.|(?:.*(?:class|className)=["']))([\w\d\s-]+?)\s*[{"']/,
        }
        let varName: string | undefined
        for (const [regexpName, regexp] of Object.entries(regexps)) {
            varName = regexp.exec(lineText)?.[1]
            if (varName) {
                if (regexpName === 'classContentRegex') {
                    const classes = varName.split(' ')
                    if (classes.length === 1) break
                    // eslint-disable-next-line no-await-in-loop
                    const selectedClass = await vscode.window.showQuickPick(classes, { title: 'Copy classname' })
                    if (!selectedClass) break
                    varName = selectedClass
                }

                break
            }
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
