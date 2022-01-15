import * as vscode from 'vscode'
import { oneOf } from '@zardoy/utils'
import { registerExtensionCommand } from 'vscode-framework'

export const registerRemoveUnusedImports = () => {
    registerExtensionCommand('removeUnusedImports', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri)
        const unusedImport = diagnostics.filter(({ code }) => oneOf(code, 6133, 6192))
        const { document } = activeEditor
        if (unusedImport.length === 0) return
        await activeEditor.edit(builder => {
            for (const problem of unusedImport) {
                const { range } = problem
                const line = document.lineAt(range.start)
                const isUnusedImport =
                    line.text.startsWith('import') ||
                    range.isEqual(new vscode.Range(line.range.start.with(undefined, line.firstNonWhitespaceCharacterIndex), line.range.end)) ||
                    range.isEqual(new vscode.Range(line.range.start.with(undefined, line.firstNonWhitespaceCharacterIndex), line.range.end.translate(0, -1)))
                if (!isUnusedImport) continue
                const rangeWithComma = range.with({ end: range.end.translate(0, 1) })
                if (document.getText(range).startsWith('import'))
                    // don't keep empty line
                    builder.delete(range.with({ end: range.end.with(range.end.line + 1, 0) }))
                else builder.delete(document.getText(rangeWithComma).endsWith(',') ? rangeWithComma : range)

                // const codeFixes = (await vscode.commands.executeCommand('vscode.executeCodeActionProvider', document.uri, decl.range)) as any
                // const delAllUnusedImportsFix = codeFixes.find(({ title }) => title === 'Delete all unused imports')
                // const cmd = delAllUnusedImportsFix.command
                // console.log(cmd.command, ...cmd.arguments)
                // console.log(delAllUnusedImportsFix)
                // const result = await vscode.commands.executeCommand(cmd.command, ...cmd.arguments)
                // console.log(result)
            }
        })
    })
}
