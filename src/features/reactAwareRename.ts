import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export const registerReactAwareRename = () => {
    registerExtensionCommand('reactAwareRename', async (_, { execCommand = true }: { execCommand?: boolean | string } = {}) => {
        const skipCommand = await (async () => {
            // Another naive implementation that shouldn't be used
            const editor = vscode.window.activeTextEditor
            if (editor === undefined || !editor.document.languageId.endsWith('react')) return false
            const { document } = editor
            const pos = editor.selection.end
            const definitions: vscode.LocationLink[] = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, pos)
            const definition = definitions[0]
            if (!definition || definition.targetUri.toString() !== document.uri.toString()) return false
            const { targetRange } = definition
            // multiline isn't supported by design
            if (targetRange.start.line !== targetRange.end.line) return false
            const lineText = document.lineAt(targetRange.end).text
            const useStatePatternMatch = /\s*const \[(.+), set\1] = /i.exec(lineText)
            if (!useStatePatternMatch) return false
            const newName = await vscode.window.showInputBox({ value: useStatePatternMatch[1] })
            if (newName === undefined) return
            const edit: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                'vscode.executeDocumentRenameProvider',
                document.uri,
                new vscode.Position(targetRange.end.line, lineText.indexOf(useStatePatternMatch[1]!)),
                newName,
            )
            const editSetter: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                'vscode.executeDocumentRenameProvider',
                document.uri,
                // though its fast
                new vscode.Position(targetRange.end.line, lineText.indexOf(', set') + ', set'.length + 1),
                `set${newName[0]!.toUpperCase()}${newName.slice(1)}`,
            )
            //@ts-expect-error merging edits
            edit._edits.push(...editSetter._edits)
            await vscode.workspace.applyEdit(edit)
            return true
        })()
        if (skipCommand === undefined || skipCommand || !execCommand) return
        await vscode.commands.executeCommand(typeof execCommand === 'string' ? execCommand : 'editor.action.rename')
    })
}
