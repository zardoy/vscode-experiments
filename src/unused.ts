import { posix } from 'path'
import { registerExtensionCommand, registerNoop } from 'vscode-framework'
import vscode from 'vscode'

const unusedCommands = () => {
    registerExtensionCommand('goToRelativePath', async () => {
        const currentUri = vscode.window.activeTextEditor?.document.uri
        if (!currentUri) {
            await vscode.window.showWarningMessage('No opened text editor')
            return
        }

        const { fs } = vscode.workspace
        const selectedPath = await new Promise<string>(resolve => {
            // TODO implement multistep
            let currentPath = '..'
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { type: vscode.FileType; name: string }>()
            const updateItems = async () => {
                const filesList = await fs.readDirectory(vscode.Uri.joinPath(currentUri, currentPath))
                quickPick.items = filesList.map(([name, type]) => ({
                    name,
                    type,
                    label: `$(${type === vscode.FileType.Directory ? 'file-directory' : 'file'}) ${name}`,
                    description: name,
                }))
            }

            // BUSY
            void updateItems()
            quickPick.onDidHide(quickPick.dispose)
            quickPick.onDidAccept(() => {
                const selectedItem = quickPick.activeItems[0]!
                const itemPath = posix.join(currentPath, selectedItem.name)
                if (selectedItem.type === vscode.FileType.Directory) {
                    currentPath = itemPath
                    void updateItems()
                } else {
                    quickPick.hide()
                    resolve(itemPath)
                }
            })
            quickPick.show()
        })
        if (selectedPath === undefined) return
        await vscode.workspace.openTextDocument(Utils.joinPath(currentUri, selectedPath))
    })
    registerExtensionCommand('addImport', async () => {
        // for TS files only
        // TODO this command will be removed from here in favor of TS plugin
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return
        // const nextImportIndex = /^(?!import)/m.exec(editor.document.getText())?.index ?? 0
        let nextImportLine = 1
        let lineIndex = 0
        for (const line of editor.document.getText().split('\n')) {
            lineIndex++
            if (line.startsWith('import')) continue
            nextImportLine = lineIndex - 1
            break
        }

        const currentPos = editor.selection.start
        await editor.insertSnippet(new vscode.SnippetString("import { $2 } from '$1'\n"), new vscode.Position(nextImportLine, 0))
        const { dispose } = vscode.window.onDidChangeTextEditorSelection(({ selections }) => {
            const currentLine = selections[0]!.start.line
            if (currentLine !== nextImportLine) dispose()

            if (currentLine <= nextImportLine) return
            // looses selections and mutl-selections
            editor.selection = new vscode.Selection(currentPos.translate(1), currentPos.translate(1))
        })
    })
    registerExtensionCommand('openTerminalWithoutFocus', async () => {
        await vscode.commands.executeCommand('workbench.action.togglePanel')
        setTimeout(() => {
            void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
        }, 150)
    })
    registerNoop('enhenced terminal', () => {
        const writeEmitter = new vscode.EventEmitter<string>()
        let line = ''
        const terminal = vscode.window.createTerminal({
            name: `My Extension REPL`,
            pty: {
                onDidWrite: writeEmitter.event,
                open: () => writeEmitter.fire('Type and press enter to echo the text\r\n\r\n'),
                close: () => {},
                handleInput: (data: string) => {
                    // https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797#general-ascii-codes
                    const codes = {
                        backspace: 127,
                        //
                        ctrlBackspace: 23,
                        del: 27,
                    }
                    if (data.charCodeAt(0) === 127) {
                        // backspace
                        writeEmitter.fire(`\b${ansiEscapes.eraseEndLine}`)
                        return
                    }

                    if (data === '\r') {
                        writeEmitter.fire(`\r\necho: "${line}"\r\n\n`)
                        line = ''
                    } else {
                        console.log('data', data.charCodeAt(0))
                        line += data
                        writeEmitter.fire(data)
                    }
                },
            },
        })
        terminal.show()
    })
}
