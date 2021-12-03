import { extensionCtx, registerActiveDevelopmentCommand } from 'vscode-framework'
import { preserveCamelCase } from './features/preserveCamelCase'
import vscode from 'vscode'
import { registerCodeActions } from './codeActions'

export const activate = () => {
    // preserve camelcase identifiers (only vars for now)
    preserveCamelCase()
    registerCodeActions()

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
        if (!vscode.window.activeTextEditor) throw new Error('no activeTextEditor')
        const pos = vscode.window.activeTextEditor.selection.active
        vscode.window.activeTextEditor.setDecorations(decoration, [
            {
                range: new vscode.Range(pos, pos.translate(0, 1)),
            },
        ])
    })
}
