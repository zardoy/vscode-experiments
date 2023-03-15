import { posix } from 'path'
import * as vscode from 'vscode'
import { extensionCtx, registerNoop } from 'vscode-framework'
import { getNormalizedVueOutline } from '@zardoy/vscode-utils/build/vue'

const unusedCommands = () => {
    registerNoop('Better Rename', () => {
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

    registerNoop('goToRelativePath', async () => {
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
        // if (selectedPath === undefined) return
        // await vscode.workspace.openTextDocument(Utils.joinPath(currentUri, selectedPath))
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
                    // if (data.codePointAt(0) === 127) {
                    //     // backspace
                    //     writeEmitter.fire(`\b${ansiEscapes.eraseEndLine}`)
                    //     return
                    // }

                    if (data === '\r') {
                        writeEmitter.fire(`\r\necho: "${line}"\r\n\n`)
                        line = ''
                    } else {
                        console.log('data', data.codePointAt(0))
                        line += data
                        writeEmitter.fire(data)
                    }
                },
            },
        })
        terminal.show()
    })
    registerNoop('format css in vue', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const outline = await getNormalizedVueOutline(activeTextEditor.document.uri)
        const styleRange = outline?.find(({ name }) => name === 'style')?.range
        if (!styleRange) return
        const selectedText = activeTextEditor.document.getText(styleRange)
        // await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.joinPath(getCurrentWorkspaceRoot().uri, 'src'));
        const { dispose } = vscode.workspace.registerTextDocumentContentProvider('virtual-css-format', {
            async provideTextDocumentContent(uri) {
                return selectedText
            },
        })
        const document = await vscode.workspace.openTextDocument(vscode.Uri.parse('virtual-css-format:dummy.css'))
        console.log('opened', selectedText)
        const textEdits: vscode.TextEdit[] = (await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider', document.uri, {})) ?? []
        if (!textEdits) {
            dispose()
            return
        }

        const positions = textEdits.map(edit => [document.offsetAt(edit.range.start), document.offsetAt(edit.range.end), edit.newText] as const)
        let newText = ''
        let lastEnd = 0
        console.log('positions', positions)
        for (const [start, end, text] of positions) {
            newText += selectedText.slice(lastEnd, start) + text
            lastEnd = end
        }

        newText += selectedText.slice(lastEnd)
        // newText = newText
        //     .split('\n')
        //     .filter(line => line.trim())
        //     .map(line => ' '.repeat(2) + line)
        //     .join('\n')
        await activeTextEditor.edit(builder => {
            builder.replace(styleRange.with(styleRange.start.translate(1).with(undefined, 0)), newText)
            // builder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)))
            // builder.insert(new vscode.Position(0, 0), newText)
            // const patchPos = (pos: vscode.Position) => pos.translate(startSelection.start.line)
            // for (const edit of textEdits) builder.replace(new vscode.Range(patchPos(edit.range.start), patchPos(edit.range.end)), edit.newText)
        })
        dispose()
    })
    registerNoop('preserve camel case', () => {
        const lastCharPos: Record<string, { char: string; pos: vscode.Position }> = {}
        vscode.window.onDidChangeTextEditorSelection(e => {
            if (e.textEditor.viewColumn === undefined) return
            const pos = e.selections[0].start
            const uriKey = e.textEditor.document.uri.toString()

            const lastPos = lastCharPos[uriKey]
            if (lastPos) {
                const replaceRange = new vscode.Range(pos, pos.translate(0, 1))
                // TODO detect actual shift
                if (lastPos.pos.translate(0, 1).isEqual(pos) && e.textEditor.document.getText(replaceRange) === lastPos.char)
                    void e.textEditor.edit(
                        builder => {
                            builder.replace(replaceRange, lastPos.char.toUpperCase())
                        },
                        {
                            undoStopAfter: false,
                            undoStopBefore: false,
                        },
                    )

                delete lastCharPos[uriKey]
                return
            }

            if (
                e.kind === undefined ||
                !e.selections[0].start.isEqual(e.selections[0].end) ||
                // TODO
                e.selections.length !== 1
            )
                return

            const text = e.textEditor.document.getText(new vscode.Range(new vscode.Position(pos.line, 0), pos.translate(0, 1)))
            const match = /.*(const|let) (\w)$/.exec(text)
            if (!match) return
            // TODO! match with url
            lastCharPos[uriKey] = {
                char: match[2]!,
                pos,
            }
        })
    })
    registerNoop('Instant TypeScript load check', () => {
        vscode.window.onDidChangeActiveTextEditor(async textEditor => {
            if (textEditor?.document.languageId !== 'typescript') return
            console.log('requested')
            try {
                const result = await vscode.commands.executeCommand('typescript.tsserverRequest', 'semanticDiagnosticsSync', {
                    _: '%%%',
                    file: textEditor.document.uri.fsPath,
                })
                console.log('received')
            } catch (error) {
                console.log('error', error.message)
            }
        })
    })
    registerNoop('Auto rename on type', () => {
        vscode.languages.registerLinkedEditingRangeProvider('*', {
            async provideLinkedEditingRanges(document, position, token) {
                if (document.uri.scheme === 'output') return
                const highlights: vscode.DocumentHighlight[] | undefined =
                    (await vscode.commands.executeCommand('vscode.executeDocumentHighlights', document.uri, position)) ?? []
                const definitions: vscode.Location[] | vscode.LocationLink[] | undefined =
                    (await vscode.commands.executeCommand('vscode.executeDefinitionProvider', document.uri, position)) ?? []
                if (!definitions) return
                const thisDefinitions = definitions
                    .map(item => (item instanceof vscode.Location ? [item.uri, item.range] : [item.targetUri, item.targetRange]))
                    .filter(res => {
                        const [uri, range] = res as [vscode.Uri, vscode.Range]
                        return uri.toString() === document.uri.toString() && range.contains(position)
                    })
                if (thisDefinitions.length > 0)
                    return {
                        ranges: highlights.map(({ range }) => range),
                        wordPattern: undefined,
                    }
                return undefined
            },
        })
    })
}
