import vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export const registerAddVscodeImport = () => {
    if (!getExtensionSetting('features.missingVscodeImportCodeAction')) return
    vscode.languages.registerCodeActionsProvider(['typescript'], {
        provideCodeActions(document, range, context, token) {
            const { diagnostics } = context
            const problem = diagnostics[0]
            if (!problem) return

            if (problem.code !== 2304) return
            const module = /'(.+)'\.$/.exec(problem.message)?.[1]
            if (!module) {
                console.warn("Can't extract name", problem)
                return
            }

            if (module !== 'vscode') return

            const importFix = new vscode.CodeAction('Add vscode import', vscode.CodeActionKind.QuickFix)
            importFix.edit = new vscode.WorkspaceEdit()
            importFix.isPreferred = true
            importFix.diagnostics = [problem]
            importFix.edit.insert(document.uri, new vscode.Position(0, 0), "import vscode from 'vscode'\n")

            return [importFix]
        },
    })
}
