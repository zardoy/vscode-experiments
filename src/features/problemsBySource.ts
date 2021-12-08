import vscode from 'vscode'
import { registerExtensionCommand, registerNoop, showQuickPick } from 'vscode-framework'
export const registerPickProblemsBySource = () => {
    registerExtensionCommand('problemsBySource', async () => {
        const document = vscode.window.activeTextEditor?.document
        if (document === undefined) return
        // lodash-marker
        const diagnosticsBySource: Record<string, vscode.Diagnostic[]> = {}
        const diagnostics = vscode.languages.getDiagnostics(document.uri)
        for (const diagnostic of diagnostics) {
            const source = diagnostic.source ?? 'No source'
            if (!diagnosticsBySource[source]) diagnosticsBySource[source] = []
            diagnosticsBySource[source]!.push(diagnostic)
        }

        const selectedSource = await showQuickPick(
            Object.entries(diagnosticsBySource)
                .sort(([, a], [, b]) => a.length - b.length)
                .map(([source, { length }]) => ({ label: source, description: `${length}`, value: source })),
        )
        if (selectedSource === undefined) return
        // snippet like navigation?
    })
}
