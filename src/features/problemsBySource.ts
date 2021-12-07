import vscode from 'vscode'
import { registerNoop, showQuickPick } from 'vscode-framework'
export const registerPickProblemsBySource = () => {
    registerNoop('Pick problems by source', async () => {
        const document = vscode.window.activeTextEditor?.document
        if (document === undefined) return
        // lodash-marker
        const diagnosticsByGroup: Record<string, vscode.Diagnostic[]> = {}
        const diagnostics = vscode.languages.getDiagnostics(document.uri)
        for (const diagnostic of diagnostics) {
            const source = diagnostic.source ?? 'No source'
            if (!diagnosticsByGroup[source]) diagnosticsByGroup[source] = []
            diagnosticsByGroup[source]!.push(diagnostic)
        }

        const selectedSource = await showQuickPick(
            Object.entries(diagnosticsByGroup)
                .sort(([, a], [, b]) => a.length - b.length)
                .map(([source, { length }]) => ({ label: source, description: `${length}`, value: source })),
        )
        if (selectedSource === undefined) return
        // snippet like navigation?
    })
}
