import * as vscode from 'vscode'
import { existsSync } from 'fs'
import { join } from 'path'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'

export default () => {
    // Command to open a context bookmark
    registerExtensionCommand('openContextBookmark', async () => {
            try {
                const currentWorkspace = getCurrentWorkspaceRoot()

                const bookmarksConfig = getExtensionSetting('contextBookmarks')

                if (!Array.isArray(bookmarksConfig)) {
                    void vscode.window.showErrorMessage('Invalid bookmarks configuration')
                    return
                }

                const bookmarks = bookmarksConfig.map(bookmark => ({
                    name: bookmark.name,
                    filePath: bookmark.filePath,
                }))

                // Filter bookmarks based on current workspace path
                const validBookmarks = bookmarks.filter(bookmark => {
                    const fullPath = join(currentWorkspace.uri.fsPath, bookmark.filePath)
                    return existsSync(fullPath)
                })

                if (validBookmarks.length === 0) {
                    void vscode.window.showInformationMessage('No valid bookmarks found for current workspace')
                    return
                }

                const selected = await vscode.window.showQuickPick(
                    validBookmarks.map(b => ({
                        label: b.name,
                        description: b.filePath,
                        bookmark: b
                    })),
                    {
                        placeHolder: 'Select a bookmark to open'
                    }
                )

                if (!selected) return

                const fullPath = vscode.Uri.file(join(currentWorkspace.uri.fsPath, selected.bookmark.filePath))

                try {
                    const stat = await vscode.workspace.fs.stat(fullPath)
                    if (stat.type === vscode.FileType.Directory) {
                        // If it's a directory, reveal in explorer
                        await vscode.commands.executeCommand('revealInExplorer', fullPath)
                    } else {
                        // If it's a file, open it
                        await vscode.workspace.openTextDocument(fullPath)
                            .then(doc => vscode.window.showTextDocument(doc))
                    }
                } catch (error) {
                    void vscode.window.showErrorMessage(`Failed to open bookmark: ${error.message}`)
                }
        } catch (err) {
            void vscode.window.showErrorMessage(`Error opening bookmarks: ${err.message}`)
        }
    })
}
