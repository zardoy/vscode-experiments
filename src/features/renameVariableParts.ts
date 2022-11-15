import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { noCase, camelCase } from 'change-case'
import { getExtensionCommandId, getExtensionContributionsPrefix, registerExtensionCommand, RegularCommands } from 'vscode-framework'
import { proxy, subscribe } from 'valtio/vanilla'
import { lowerCaseFirst } from 'lower-case-first'
import { Utils as UriUtils } from 'vscode-uri'
import { extname } from 'path-browserify'

// doesn't support multicursor
export const registerRenameVariableParts = () => {
    // small task: add back button when editingIndex (like in GitLens menus)
    registerExtensionCommand('renameVariableParts', async (_data, renamingEntity: 'fileName' | 'variable' = 'variable') => {
        const activeEditor = getActiveRegularEditor()
        if (!activeEditor) return

        const quickPick = vscode.window.createQuickPick()
        const { document, selection } = activeEditor
        const { uri } = document

        let editRange = /*  selection.isEmpty ? */ document.getWordRangeAtPosition(selection.end) /* : selection */
        let inputTextOverride: string | undefined
        if (renamingEntity === 'variable') {
            try {
                type PrepareRenameResult = {
                    range: vscode.Range
                    placeholder: string
                }
                const { placeholder, range } = await vscode.commands.executeCommand<PrepareRenameResult>('vscode.prepareRename', uri, selection.end)
                editRange = range
                inputTextOverride = placeholder
            } catch {}

            if (!editRange || editRange.isEmpty) {
                void vscode.window.showWarningMessage('You cannot rename this element')
                return
            }
        }

        let isDisposeEnabled = true
        /** expected: dash or underscore */
        let separatorChar = ''

        let preselectedPartIndex = -1

        const parts = proxy([] as string[])

        const getFilenameAndExtension = () => {
            const fullFileName = UriUtils.basename(uri)
            let fileName = fullFileName
            let fullExt = ''
            // cut extension twice e.g. file.test.ts -> file & .test.ts
            for (const _i of Array.from({ length: 2 })) {
                const ext = extname(fileName)
                if (ext.length === 0) continue

                fileName = fileName.slice(0, -ext.length)
                fullExt = `${ext}${fullExt}`
            }

            return {
                fileName,
                fullExt,
            }
        }

        const setActiveItem = (existingIndex: number) => {
            // do it in next loop after items update (most probably)
            setTimeout(() => {
                quickPick.activeItems = [quickPick.items[existingIndex]!]
            })
        }

        const preselectItemUnderCursor = (splittedParts: string[]) => {
            const cursorPosOffset = document.offsetAt(selection.active)
            const wordStartOffset = document.offsetAt(editRange!.start)
            const selectedWordCursorOffset = Math.abs(cursorPosOffset - wordStartOffset)

            let accumulatedLength = 0
            for (const [i, part] of splittedParts.entries()) {
                accumulatedLength += part.length
                if (selectedWordCursorOffset <= accumulatedLength) {
                    preselectedPartIndex = i
                    setActiveItem(preselectedPartIndex)
                    break
                }
            }
        }

        const { fileName, fullExt } = getFilenameAndExtension()

        // init parts
        const inputText = inputTextOverride ?? renamingEntity === 'variable' ? document.getText(editRange) : fileName
        noCase(inputText, {
            transform(part, index, wordParts) {
                if (preselectedPartIndex === -1 && renamingEntity === 'variable') preselectItemUnderCursor(wordParts)
                if (index === 1) separatorChar = inputText[parts[0]!.length]!
                parts.push(part)
                return ''
            },
        })

        // if transformation results no differences - we're already in camel case
        // we don't support mixed casing e.g. SomeVariable_meta
        const isCamelCase = [inputText, lowerCaseFirst(inputText)].includes(camelCase(inputText))
        if (isCamelCase) separatorChar = ''
        let isPascalCase = parts[0]![0]!.toUpperCase() === parts[0]![0]

        const getResultingName = () => parts.join(separatorChar)
        const updateTitle = (state: 'input' | 'quickPick') => {
            const partsTemp = [...parts]
            const mainIndex = getActiveItemIndex() ?? -1
            const mainPart = partsTemp[mainIndex]
            // handle -1 case
            if (!mainPart) return ''
            partsTemp[mainIndex] = state === 'input' ? `[${mainPart}]` : `|${mainPart}`
            return partsTemp.join(separatorChar)
        }

        const getActiveItemIndex = () => {
            const [activeItem] = quickPick.activeItems
            if (!activeItem) return
            return quickPick.items.indexOf(activeItem)
        }

        const upperCaseFirstLetter = (part: string) => `${part[0]!.toUpperCase()}${part.slice(1)}`

        const updateMainTitle = (state: 'input' | 'quickPick') =>
            `Rename ${renamingEntity === 'variable' ? 'variable' : 'filename'} parts: ${updateTitle(state)}`

        const updateQuickPick = () => {
            quickPick.items = parts.map(part => ({ label: part }))
            quickPick.title = updateMainTitle('quickPick')
        }

        // watch parts
        const updateParts = () => {
            // of course we could do this normalization at apply step
            // but we want nice true display in quickPick items
            if (isCamelCase) {
                // do camel case capitalization

                // #region preserve casing for first word
                const ensureMethod = isPascalCase ? 'toUpperCase' : 'toLowerCase'
                const firstCharactersEqual = parts[0]?.[0]?.[ensureMethod]() === parts[0]?.[0]

                if (!firstCharactersEqual) parts[0] = `${parts[0]![0]![ensureMethod]()}${parts[0]!.slice(1)}`
                // #endregion

                // ensure every single next part is capitalized
                for (const [i, part] of parts.entries()) {
                    if (i === 0) continue
                    parts[i] = upperCaseFirstLetter(part)
                }
            }

            updateQuickPick()
        }

        updateParts()
        updateQuickPick()
        subscribe(parts, updateParts)

        quickPick.onDidChangeActive(() => {
            quickPick.title = updateMainTitle('quickPick')
        })
        const moveVariableParts = (direction: 'up' | 'down') => {
            const currentActiveItemIndex = getActiveItemIndex() ?? -1
            const currentPart = parts[currentActiveItemIndex]
            // handle -1 index
            if (!currentPart) return
            const moveOffset = direction === 'up' ? -1 : 1
            const newItemIndex = currentActiveItemIndex + moveOffset
            const prevOrNextPart = parts[newItemIndex]!
            if (!prevOrNextPart) return
            parts.splice(newItemIndex, 1, currentPart)
            parts.splice(currentActiveItemIndex, 1, prevOrNextPart)

            setActiveItem(newItemIndex)
        }

        const registerCommand = (command: keyof RegularCommands, handler: () => void) =>
            vscode.commands.registerCommand(`${getExtensionContributionsPrefix()}${command}`, handler)

        const mainDisposable = vscode.Disposable.from(
            quickPick,
            registerCommand('renameVariablePartsDeletePart', () => {
                if (parts.length === 0) return
                parts.splice(getActiveItemIndex()!, 1)
                updateQuickPick()
            }),
            registerCommand('renameVariablePartsExtractPart', () => {
                if (parts.length === 0) return
                const onlyPart = parts[getActiveItemIndex()!]!
                parts.splice(0, parts.length)
                parts.push(onlyPart)
                updateQuickPick()
            }),
            registerCommand('renameVariablePartsLowercasePart', () => {
                if (parts.length === 0) return
                const index = getActiveItemIndex()!
                const content = parts[index]!

                if (index === 0) {
                    isPascalCase = false
                    parts[0] = content.toLowerCase()
                    return
                }

                const prevIndex = index - 1
                parts.splice(index, 1)
                parts[prevIndex] = `${parts[prevIndex]!}${content.toLowerCase()}`
                updateQuickPick()
            }),
            registerCommand('renameVariablePartsPartMoveUp', () => {
                moveVariableParts('up')
            }),
            registerCommand('renameVariablePartsPartMoveDown', () => {
                moveVariableParts('down')
            }),
            registerCommand('renameVariablePartsAccept', async () => {
                mainDisposable.dispose()
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Renaming ${renamingEntity === 'fileName' ? 'file' : 'variable'}` },
                    async () => {
                        let edit = new vscode.WorkspaceEdit()

                        if (renamingEntity === 'fileName') edit.renameFile(uri, UriUtils.joinPath(uri, '..', `${getResultingName()}${fullExt}`))

                        if (renamingEntity === 'variable')
                            edit = await vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', uri, selection.end, getResultingName())

                        await vscode.workspace.applyEdit(edit)
                    },
                )
            }),
            registerCommand('renameVariablePartsAcceptReplace', () => {
                if (renamingEntity === 'variable')
                    void activeEditor.edit(builder => {
                        builder.replace(editRange!, getResultingName())
                    })

                if (renamingEntity === 'variable') void vscode.commands.executeCommand(getExtensionCommandId('renameVariablePartsAccept'))

                mainDisposable.dispose()
            }),
            {
                dispose() {
                    void vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', false)
                },
            },
        )
        quickPick.onDidAccept(async () => {
            const activeItem = quickPick.activeItems[0]!
            if (!activeItem) return
            const updatingPartIndex = quickPick.items.indexOf(activeItem)
            const { label } = activeItem
            isDisposeEnabled = false
            const renamedPart = await vscode.window.showInputBox({ value: label, title: updateMainTitle('input') })

            if (renamedPart === '') {
                await vscode.commands.executeCommand(getExtensionCommandId('renameVariablePartsDeletePart'))
            } else {
                if (renamedPart) parts.splice(updatingPartIndex, 1, renamedPart)
                setActiveItem(updatingPartIndex)
            }

            updateQuickPick()

            quickPick.show()
            isDisposeEnabled = true
        })
        await vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', true)

        quickPick.show()
        quickPick.onDidHide(() => {
            if (isDisposeEnabled) mainDisposable.dispose()
        })
    })
}
