import vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerRemoveUnusedImports = () => {
    registerExtensionCommand('removeUnusedImports', async () => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri)
        const unusedDecl = diagnostics.filter(({ severity, code }) => severity === vscode.DiagnosticSeverity.Hint && code === 6133)
        const { document } = activeEditor
        if (unusedDecl.length === 0) return
        await activeEditor.edit(builder => {
            for (const decl of unusedDecl) {
                const declRange = decl.range
                const line = document.lineAt(declRange.start)
                const isUnusedImport =
                    line.text.startsWith('import') ||
                    decl.range.isEqual(new vscode.Range(line.range.start.with(undefined, line.firstNonWhitespaceCharacterIndex), line.range.end)) ||
                    decl.range.isEqual(
                        new vscode.Range(line.range.start.with(undefined, line.firstNonWhitespaceCharacterIndex), line.range.end.translate(0, -1)),
                    )
                if (!isUnusedImport) continue
                builder.delete(line.text.endsWith(',') ? declRange.with({ end: declRange.end.translate(0, 1) }) : declRange)
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
