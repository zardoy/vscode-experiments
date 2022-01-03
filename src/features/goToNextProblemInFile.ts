import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export const registerGoToNextProblemInFile = () => {
    registerExtensionCommand('goToNextProblemInFile', async (_, backwards = false) => {
        const activeEditor = vscode.window.activeTextEditor
        if (!activeEditor || activeEditor.viewColumn === undefined) return

        await vscode.commands.executeCommand(`editor.action.marker.${backwards ? 'prev' : 'next'}`)
        const triggerCodeAction = getExtensionSetting('goToNextProblemInFile.triggerCodeAction')
        if (triggerCodeAction !== 'disabled') {
            if (triggerCodeAction === 'ifAppliable') {
                const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
                    'vscode.executeCodeActionProvider',
                    activeEditor.document.uri,
                    activeEditor.selection,
                )
                const quickfixes = codeActions.filter(
                    ({ kind, isPreferred }) => isPreferred === true || (kind && vscode.CodeActionKind.QuickFix.contains(kind)),
                )
                if (quickfixes.length === 0) return
            }

            await vscode.commands.executeCommand('editor.action.quickFix')
        }
    })
}
