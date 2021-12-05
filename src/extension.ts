import vscode from 'vscode'
import { extensionCtx, registerActiveDevelopmentCommand, registerExtensionCommand } from 'vscode-framework'
import { preserveCamelCase } from './features/preserveCamelCase'
import { registerAlwaysTab } from './features/specialTab'
import { registerTsCodeactions } from './features/tsCodeactions'
import { registerRegexCodeActions } from './features/regexCodeactions'
import { registerAddVscodeImport } from './features/addVscodeImport'
import { registerAddImport } from './features/addImport'
import { registerFixedSurroundIf } from './features/fixedSurroundIf'
export const activate = () => {
    // preserve camelcase identifiers (only vars for now)
    preserveCamelCase()
    registerTsCodeactions()
    registerRegexCodeActions()
    registerAlwaysTab()
    registerAddVscodeImport()
    registerAddImport()
    registerFixedSurroundIf()

    // vscode.languages.registerSelectionRangeProvider('*', {
    //     provideSelectionRanges(document, positions, token) {

    //     }
    // })

    // vscode.languages.registerDocumentSemanticTokensProvider('typescript', {

    // }, {})

    registerExtensionCommand('openUrl', async (_, url: string) => {
        await vscode.env.openExternal(vscode.Uri.parse(url))
    })

    registerExtensionCommand('goToNextErrorInFile', async (_, url: string) => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return
        const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri)
        const errors = diagnostics.filter(({ severity }) => severity === vscode.DiagnosticSeverity.Error)
        let nextRange = errors[0]?.range
        for (const { range } of errors) {
            if (!range.start.isAfter(activeEditor.selection.end)) continue
            nextRange = range
            break
        }

        if (!nextRange) return
        activeEditor.selections = [new vscode.Selection(nextRange.start, nextRange.end)]
        activeEditor.revealRange(activeEditor.selection)
        await vscode.commands.executeCommand('editor.action.marker.next')
    })

    if (process.env.NODE_ENV !== 'development') return
    registerActiveDevelopmentCommand(() => {
        const decoration = vscode.window.createTextEditorDecorationType({
            dark: {
                before: {
                    contentIconPath: extensionCtx.asAbsolutePath('resources/editDark.svg'),
                },
            },
            light: {
                before: {
                    contentIconPath: extensionCtx.asAbsolutePath('resources/edit.svg'),
                },
            },
            // rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
        if (!vscode.window.activeTextEditor) throw new Error('no activeTextEditor')
        const pos = vscode.window.activeTextEditor.selection.active
        vscode.window.activeTextEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos, pos.translate(0, 1)),
            },
        ])
    })
}
