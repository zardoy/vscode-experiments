import * as vscode from 'vscode'
import { oneOf, findCustomArray, compact } from '@zardoy/utils'
import { getExtensionCommandId, getExtensionSetting, getExtensionSettingId, registerExtensionCommand } from 'vscode-framework'
import { noCase } from 'change-case'
import { proxy, subscribe } from 'valtio/vanilla'
import { range } from 'rambda'

export default () => {
    const focusTabFromLeft = async (index: number) => {
        const input = vscode.window.tabGroups.activeTabGroup.tabs[index]?.input
        if (!(input instanceof vscode.TabInputText)) return
        const { uri } = input
        if (!uri) return
        await vscode.window.showTextDocument(uri)
    }

    const disposables: vscode.Disposable[] = []
    let updateDecorations: (uris?: vscode.Uri[]) => void | undefined
    const register = () => {
        const mode = getExtensionSetting('features.showTabNumbers')
        const recentByMode = oneOf(mode, 'recentlyOpened', 'recentlyFocused')
        // for recentByMode
        const recentFileStack: vscode.Uri[] = proxy([])
        disposables.push(
            vscode.commands.registerCommand(getExtensionCommandId('focusTabByNumber'), async number => {
                if (mode === 'disabled') {
                    void vscode.window.showWarningMessage('features.showTabNumbers setting is disabled')
                    return
                }

                const index = number - 1
                console.log('focus', number)
                if (mode === 'fromLeft') await focusTabFromLeft(index)
                // eslint-disable-next-line sonarjs/no-duplicate-string
                const tabUriToFocus = (getExtensionSetting('showTabNumbers.reversedMode') ? [...recentFileStack].reverse() : recentFileStack)[index]
                if (!tabUriToFocus) return
                const tabUri = findCustomArray(vscode.window.tabGroups.all as vscode.TabGroup[], tabGroup =>
                    findCustomArray(tabGroup.tabs as vscode.Tab[], tab => {
                        if (!(tab.input instanceof vscode.TabInputText)) return
                        const { uri } = tab.input
                        return uri?.toString() === tabUriToFocus.toString() && uri
                    }),
                )
                if (!tabUri) return
                await vscode.window.showTextDocument(tabUri)
            }),
        )
        if (mode === 'disabled') return
        const humanReadableMode = noCase(mode)

        class FileDecorationProvider implements vscode.FileDecorationProvider {
            listeners: Array<(e: vscode.Uri | vscode.Uri[] | undefined) => any> = []

            constructor() {
                subscribe(recentFileStack, ops => {
                    const deletedUris = compact(ops.map(([operation, _affectedIndexes, uri]) => (operation === 'delete' ? (uri as vscode.Uri) : undefined)))
                    for (const listener of this.listeners) listener([...recentFileStack, ...deletedUris])
                })
                updateDecorations = uris => {
                    for (const listener of this.listeners) listener(uris ?? recentFileStack)
                }
            }

            onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> | undefined = listener => {
                this.listeners.push(listener)
                return {
                    dispose() {},
                }
            }

            provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FileDecoration> {
                if (!recentByMode) {
                    const { tabs } = vscode.window.tabGroups.activeTabGroup
                    const tabIndex = tabs.findIndex(tab => {
                        if (!(tab.input instanceof vscode.TabInputText)) return
                        const { uri: tabUri } = tab.input
                        return tabUri?.toString() === uri.toString()
                    })
                    if (tabIndex === -1) return
                    const tabNumber = tabIndex + 1
                    return {
                        badge: `${tabNumber}`,
                        tooltip: `${tabNumber} ${humanReadableMode}`,
                    }
                }

                const tabIndex = (getExtensionSetting('showTabNumbers.reversedMode') ? [...recentFileStack].reverse() : recentFileStack).findIndex(
                    elemUri => elemUri.toString() === uri.toString(),
                )
                if (tabIndex === -1) return
                const tabNumber = tabIndex + 1
                return {
                    badge: `${tabNumber}`,
                    propagate: false,
                    tooltip: `${tabNumber}: by ${humanReadableMode}`,
                }
            }
        }
        disposables.push(vscode.window.registerFileDecorationProvider(new FileDecorationProvider()))
        if (!recentByMode) {
            disposables.push(
                vscode.window.tabGroups.onDidChangeTabs(({ opened, changed, closed }) => {
                    const previewTabs: vscode.Uri[] = []
                    for (const { isPreview, input } of [...closed, ...opened, ...changed])
                        if (isPreview && input instanceof vscode.TabInputText) previewTabs.push(input.uri)

                    const updating = compact(
                        vscode.window.tabGroups.activeTabGroup.tabs.map(({ input }) => {
                            if (!(input instanceof vscode.TabInputText)) return
                            return input.uri
                        }),
                    )
                    if (previewTabs.length > 0) {
                        updateDecorations([...previewTabs, ...updating])
                        return
                    }

                    updateDecorations(updating)
                }),
            )
            return
        }

        disposables.push(
            vscode.window.onDidChangeActiveTextEditor(textEditor => {
                if (!textEditor || textEditor.viewColumn === undefined) return
                const { uri } = textEditor.document
                const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === uri.toString())
                if (elemIndex === -1 && recentFileStack.length < 9) {
                    recentFileStack.unshift(uri)
                    return
                }

                if (elemIndex === -1 && mode === 'recentlyOpened') {
                    recentFileStack.pop()
                    recentFileStack.unshift(uri)
                }

                if (mode === 'recentlyFocused') {
                    recentFileStack.splice(elemIndex, 1)
                    recentFileStack.unshift(uri)
                }
            }),
            vscode.workspace.onDidCloseTextDocument(document => {
                const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === document.uri.toString())
                if (elemIndex === -1) return
                recentFileStack.splice(elemIndex, 1)
            }),
        )
    }

    register()
    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (affectsConfiguration(getExtensionSettingId('features.showTabNumbers'))) {
            vscode.Disposable.from(...disposables).dispose()
            register()
        }

        if (affectsConfiguration(getExtensionSettingId('showTabNumbers.reversedMode'))) updateDecorations?.()
    })

    registerExtensionCommand('generateKeybindingsForTabsWithNumbers', async () => {
        await vscode.env.clipboard.writeText(
            range(1, 10)
                .map(number =>
                    JSON.stringify(
                        {
                            key: `ctrl+${number}`,
                            command: getExtensionCommandId('focusTabByNumber'),
                            args: number,
                        },
                        undefined,
                        4,
                    ),
                )
                .join(',\n'),
        )
        await vscode.commands.executeCommand('workbench.action.openGlobalKeybindingsFile')
        void vscode.window.showInformationMessage('You can now paste just copied keybindings to the end')
    })
}
