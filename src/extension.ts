import { extensionCtx, registerActiveDevelopmentCommand } from 'vscode-framework'
import { preserveCamelCase } from './features/preserveCamelCase'
import vscode from 'vscode'

export const activate = () => {
    // preserve camelcase identifiers (only vars for now)
    preserveCamelCase()

    registerActiveDevelopmentCommand(() => {
        const decoration = vscode.window.createTextEditorDecorationType({
            // before: {
            // },
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
        const pos = vscode.window.activeTextEditor.selection.active
        vscode.window.activeTextEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos, pos.translate(0, 1)),
            },
        ])
    })
}
