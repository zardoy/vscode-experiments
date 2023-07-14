/* eslint-disable no-await-in-loop */
import * as vscode from 'vscode'
import { groupBy } from 'rambda'
import { showQuickPick } from 'vscode-framework'

const WIP = async () => {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) return
    const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri)
    const selectionsToRestore = activeEditor.selections
    try {
        for (const selection of activeEditor.selections) {
            const text = activeEditor.document.getText(selection)
            const rangeDiagnostics = diagnostics.map(diagnostic => ({ ...diagnostic, range: diagnostic.range.intersection(selection)! })).filter(Boolean)
            const diagnosticsBySource = groupBy(({ source }) => source ?? 'Without source', rangeDiagnostics)
            const pickedSources = await showQuickPick(
                Object.entries(diagnosticsBySource).map(([name, diagnostics]) => ({
                    label: name,
                    value: diagnostics,
                    description: diagnostics.length.toString(),
                    picked: true,
                })),
                { canPickMany: true, title: 'Which sources in selection to include?' },
            )
            if (pickedSources === undefined) return
            const pickedDiagnostics = await showQuickPick(
                pickedSources.flat(1).map(diagnostic => ({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    label: `${diagnostic.source} ${diagnostic.code && typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code}`,
                    detail: diagnostic.message,
                    value: diagnostic,
                    picked: true,
                })),
                {
                    canPickMany: true,
                    matchOnDetail: true,
                    onDidChangeActive(items) {
                        const item = items[0]!
                        console.log(item.label)
                    },
                },
            )
            if (pickedDiagnostics === undefined) return
            // TODO mb use EOL?
            const textLines = text.split('\n').map(str => [str] as [string, string?])
            for (const [line] of textLines) {
                // const lineRange =
            }
        }
    } finally {
        activeEditor.selections = selectionsToRestore
    }
}
