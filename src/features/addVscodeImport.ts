import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { notFoundModule } from '../codeActions'

export const registerAddVscodeImport = () => {
    if (!getExtensionSetting('features.missingVscodeImportCodeAction')) return
    vscode.languages.registerCodeActionsProvider(['typescript'], {
        provideCodeActions(document, range, context, token) {
            const { diagnostics } = context
            const problem = diagnostics[0]
            if (!problem) return

            const module = notFoundModule(problem)
            if (!module || module !== 'vscode') return

            const importFix = new vscode.CodeAction('Add vscode import', vscode.CodeActionKind.QuickFix)
            importFix.edit = new vscode.WorkspaceEdit()
            importFix.isPreferred = true
            importFix.diagnostics = [problem]
            importFix.edit.insert(document.uri, new vscode.Position(0, 0), "import * as vscode from 'vscode'\n")

            return [importFix]
        },
    })
}
