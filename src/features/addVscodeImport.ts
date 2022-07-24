import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'
import { notFoundModule } from '../codeActions'
import {} from '@zardoy/vscode-utils/build/'

export const registerAddVscodeImport = () => {
    if (!getExtensionSetting('features.missingVscodeImportCodeAction')) return
    vscode.languages.registerCodeActionsProvider(['typescript'], {
        provideCodeActions(document, range, context, token) {
            const { diagnostics } = context
            let module: string | boolean | undefined
            let fixingDiagnostic: vscode.Diagnostic | undefined
            for (const diagnostic of diagnostics) {
                module = notFoundModule(diagnostic)
                if (module) {
                    fixingDiagnostic = diagnostic
                    break
                }
            }

            if (!fixingDiagnostic || !module || module !== 'vscode') return

            const importFix = new vscode.CodeAction('Add vscode import', vscode.CodeActionKind.QuickFix)
            importFix.edit = new vscode.WorkspaceEdit()
            importFix.isPreferred = true
            importFix.diagnostics = [fixingDiagnostic]
            importFix.edit.insert(document.uri, new vscode.Position(0, 0), "import * as vscode from 'vscode'\n")

            return [importFix]
        },
    })
}
