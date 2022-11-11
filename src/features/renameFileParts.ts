import * as vscode from 'vscode'
import { extname } from 'path'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { noCase, camelCase } from 'change-case'
import { getExtensionContributionsPrefix, registerExtensionCommand, RegularCommands } from 'vscode-framework'
import { proxy, subscribe } from 'valtio/vanilla'
import { lowerCaseFirst } from 'lower-case-first'
import { Utils as UriUtils } from 'vscode-uri'

export const registerRenameFileParts = () => {
    // small task: add back button when editingIndex (like in GitLens menus)
    registerExtensionCommand('renameFileParts', async () => {
        const activeEditor = getActiveRegularEditor()
        if (!activeEditor) return

        const { uri: sourceUri } = activeEditor.document
        const fullFileName = UriUtils.basename(sourceUri)
        let fileName = fullFileName
        let fullExt = ''
        // cut extension twice e.g. file.test.ts -> file & .test.ts
        for (const _i of Array.from({ length: 2 })) {
            const ext = extname(fileName)
            if (ext.length === 0) continue

            fileName = fileName.slice(0, -ext.length)
            fullExt = `${ext}${fullExt}`
        }

        let newFileName: string
        const quickPick = vscode.window.createQuickPick()

        const parts = proxy([] as string[])
        let isDisposeEnabled = true
        /** expected: dash or underscore */
        let separatorChar = ''

        // init parts
        noCase(fileName, {
            transform(part, index, wordParts) {
                if (index === 1) separatorChar = fileName[parts[0]!.length]!
                parts.push(part)
                return ''
            },
        })

        // if transformation results no differences - we're already in camel case
        // we don't support mixed casing e.g. SomeVariable_meta
        const isCamelCase = [fileName, lowerCaseFirst(fileName)].includes(camelCase(fileName))
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

        const setActiveItem = (existingIndex: number) => {
            // do it in next loop after items update (most probably)
            setTimeout(() => {
                quickPick.activeItems = [quickPick.items[existingIndex]!]
            })
        }

        const upperCaseFirstLetter = (part: string) => `${part[0]!.toUpperCase()}${part.slice(1)}`

        const updateMainTitle = (state: 'input' | 'quickPick') => `Rename variable parts: ${updateTitle(state)}`

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
            registerCommand('renameFilePartsDeletePart', () => {
                if (parts.length === 0) return
                parts.splice(getActiveItemIndex()!, 1)
                updateQuickPick()
            }),
            registerCommand('renameFilePartsExtractPart', () => {
                if (parts.length === 0) return
                const onlyPart = parts[getActiveItemIndex()!]!
                parts.splice(0, parts.length)
                parts.push(onlyPart)
                updateQuickPick()
            }),
            registerCommand('renameFilePartsLowercasePart', () => {
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
            registerCommand('renameFilePartsPartMoveUp', () => {
                moveVariableParts('up')
            }),
            registerCommand('renameFilePartsPartMoveDown', () => {
                moveVariableParts('down')
            }),
            registerCommand('renameFilePartsAccept', async () => {
                const edit = new vscode.WorkspaceEdit()
                edit.renameFile(sourceUri, UriUtils.joinPath(sourceUri, '..', `${getResultingName()}${fullExt}`))
                await vscode.workspace.applyEdit(edit)
                mainDisposable.dispose()
            }),
            {
                dispose() {
                    void vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameFilePartsOpened', false)
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

            if (renamedPart) {
                parts.splice(updatingPartIndex, 1, renamedPart)
                updateQuickPick()
                setActiveItem(updatingPartIndex)
            }

            if (renamedPart === '') await vscode.commands.executeCommand('zardoyExperiments.renameFilePartsDeletePart')

            updateQuickPick()

            quickPick.show()
            isDisposeEnabled = true
        })
        await vscode.commands.executeCommand('setContext', 'zardoyExperiments.renameFilePartsOpened', true)

        quickPick.show()
        quickPick.onDidHide(() => {
            if (isDisposeEnabled) mainDisposable.dispose()
        })
    })
}
