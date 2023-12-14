import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { Utils } from 'vscode-uri'

export default () => {
    registerExtensionCommand('reactAwareRename', async (_, { execCommand = true }: { execCommand?: boolean | string } = {}) => {
        const skipCommand = await (async () => {
            // Another naive implementation that shouldn't be used
            const editor = vscode.window.activeTextEditor
            if (editor === undefined || !editor.document.languageId.endsWith('react')) return false
            const { document, selection } = editor
            const pos = selection.end
            const definitions: vscode.LocationLink[] = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, pos)
            const definition = definitions[0]
            if (!definition || definition.targetUri.toString() !== document.uri.toString()) return false
            let { targetRange, targetSelectionRange } = definition
            if (targetSelectionRange) targetRange = targetSelectionRange
            // multiline isn't supported by design
            if (targetRange.start.line !== targetRange.end.line) return false
            const lineText = document.lineAt(targetRange.end).text
            const useStatePatternMatch = /\s*const \[(.+), set\1] = /i.exec(lineText)
            if (!useStatePatternMatch) {
                const fileName = Utils.basename(document.uri).replace(/\..+$/, '')
                if (getExtensionSetting('reactAware.autoTriggerRenameComponent') && document.getText(targetRange) === fileName) {
                    await vscode.commands.executeCommand('extraCommands.renameSymbolAndFile')
                    return true
                }

                return false
            }

            const newName = await vscode.window.showInputBox({ value: useStatePatternMatch[1] })
            if (newName === undefined) return
            const mainEdit: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                'vscode.executeDocumentRenameProvider',
                document.uri,
                new vscode.Position(targetRange.end.line, lineText.indexOf(useStatePatternMatch[1]!)),
                newName,
            )
            const setterEdit: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                'vscode.executeDocumentRenameProvider',
                document.uri,
                new vscode.Position(targetRange.end.line, lineText.indexOf(', set') + ', set'.length + 1),
                `set${newName[0]!.toUpperCase()}${newName.slice(1)}`,
            )

            mainEdit.set(document.uri, [...setterEdit.get(document.uri)])
            await vscode.workspace.applyEdit(mainEdit)
            return true
        })()
        if (skipCommand === undefined || skipCommand || !execCommand) return
        await vscode.commands.executeCommand(typeof execCommand === 'string' ? execCommand : 'editor.action.rename')
    })
}
