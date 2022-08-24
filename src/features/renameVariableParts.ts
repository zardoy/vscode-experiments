import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { noCase, camelCase } from 'change-case'
import { getExtensionContributionsPrefix, registerExtensionCommand, RegularCommands } from 'vscode-framework'
import { proxy, subscribe } from 'valtio/vanilla'

// doesn't support multicursor
export const registerRenameVariableParts = () => {
    // small task: add back button when editingIndex (like in GitLens menus)
    registerExtensionCommand('renameVariableParts', async () => {
        const activeEditor = getActiveRegularEditor()
        if (!activeEditor) return

        const quickPick = vscode.window.createQuickPick()
        const { document, selection } = activeEditor
        const editRange = selection.isEmpty ? document.getWordRangeAtPosition(selection.end) : selection
        if (!editRange || editRange.isEmpty) {
            await vscode.window.showWarningMessage('No word range at position')
            return
        }

        const parts = proxy([] as string[])
        /** expected: dash or underscore */
        let seperatorChar = ''
        // init parts
        const inputText = document.getText(editRange)
        noCase(inputText, {
            transform(part, index) {
                if (index === 1) seperatorChar = inputText[parts[0]!.length]!
                parts.push(part)
                return ''
            },
        })

        // if transformation results no differences - we're already in camel case
        // we don't support mixed casing e.g. SomeVariable_meta
        const isCamelCase = camelCase(inputText) === inputText
        if (isCamelCase) seperatorChar = ''
        let isPascalCase = parts[0]![0]!.toUpperCase() === parts[0]![0]

        let editingIndex: number | undefined

        const getResultingName = () => parts.join(seperatorChar)
        const getQuickPickTitle = () => {
            const partsTemp = [...parts]
            const mainIndex = editingIndex === undefined ? getActiveItemIndex() ?? -1 : editingIndex
            const mainPart = partsTemp[mainIndex]
            // handle -1 case
            if (!mainPart) return ''
            partsTemp[mainIndex] = editingIndex === undefined ? `|${mainPart}` : `[${mainPart}]`
            return partsTemp.join(seperatorChar)
        }

        const getActiveItemIndex = () => {
            const [activeItem] = quickPick.activeItems
            if (!activeItem) return
            return quickPick.items.indexOf(activeItem)
        }

        const setActiveItem = (existingIndex: number) => {
            // do it in next loop after items update (most probably)
            setTimeout(() => {
                quickPick.activeItems = [quickPick.items[existingIndex]!]
            })
        }

        const upperCaseFirstLetter = (part: string) => `${part[0]!.toUpperCase()}${part.slice(1)}`

        const updateMainTitle = () => {
            quickPick.title = `Rename variable parts: ${getQuickPickTitle()}`
        }

        const resetItems = () => {
            quickPick.items = parts.map(part => ({ label: part }))
            if (editingIndex !== undefined) setActiveItem(editingIndex)
            updateMainTitle()
            editingIndex = undefined
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

            if (editingIndex === undefined) resetItems()
        }

        updateParts()
        resetItems()
        subscribe(parts, updateParts)

        quickPick.onDidChangeActive(() => {
            if (editingIndex !== undefined) return
            updateMainTitle()
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
                parts.splice(editingIndex ?? getActiveItemIndex()!, 1)
                resetItems()
            }),
            registerCommand('renameVariablePartsExtractPart', () => {
                if (parts.length === 0) return
                const onlyPart = parts[editingIndex ?? getActiveItemIndex()!]!
                parts.splice(0, parts.length)
                parts.push(onlyPart)
                resetItems()
            }),
            registerCommand('renameVariablePartsLowercasePart', () => {
                if (parts.length === 0) return
                const index = editingIndex ?? getActiveItemIndex()!
                const content = editingIndex ? quickPick.value : parts[index]!

                if (index === 0) {
                    isPascalCase = false
                    parts[0] = content.toLowerCase()
                    return
                }

                const prevIndex = index - 1
                parts.splice(index, 1)
                parts[prevIndex] = `${parts[prevIndex]!}${content.toLowerCase()}`
                if (editingIndex) quickPick.value = ''
                resetItems()
            }),
            registerCommand('renameVariablePartsPartMoveUp', () => {
                moveVariableParts('up')
            }),
            registerCommand('renameVariablePartsPartMoveDown', () => {
                moveVariableParts('down')
            }),
            registerCommand('renameVariablePartsAccept', async () => {
                quickPick.hide()
                const edit: vscode.WorkspaceEdit = await vscode.commands.executeCommand(
                    'vscode.executeDocumentRenameProvider',
                    document.uri,
                    selection.end,
                    getResultingName(),
                )
                await vscode.workspace.applyEdit(edit)
            }),
            registerCommand('renameVariablePartsAcceptReplace', () => {
                void activeEditor.edit(builder => {
                    builder.replace(editRange, getResultingName())
                })
                quickPick.hide()
            }),
            {
                dispose() {
                    void vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', false)
                },
            },
        )
        quickPick.onDidAccept(() => {
            const activeItem = quickPick.activeItems[0]!
            if (editingIndex === undefined) {
                if (!activeItem) return
                editingIndex = quickPick.items.indexOf(activeItem)
                const { label } = activeItem
                quickPick.items = []
                quickPick.title = `Editing part: ${getQuickPickTitle()}`
                quickPick.value = label
                return
            }

            parts.splice(editingIndex, 1, quickPick.value)
            resetItems()
            quickPick.value = ''
        })
        quickPick.onDidHide(() => {
            mainDisposable.dispose()
        })
        await vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameVariablePartsOpened', true)
        quickPick.show()
    })
}
