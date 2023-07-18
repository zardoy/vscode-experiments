import * as vscode from 'vscode'
import { oneOf, findCustomArray, compact } from '@zardoy/utils'
import { getExtensionCommandId, getExtensionSetting, getExtensionSettingId, registerExtensionCommand } from 'vscode-framework'
import { noCase } from 'change-case'
import { proxy, subscribe } from 'valtio/vanilla'
import { range } from 'rambda'

export default () => {
    const focusTabFromLeft = async (index: number) => {
        const input = vscode.window.tabGroups.activeTabGroup.tabs.filter(({ input }) => input instanceof vscode.TabInputText)[index]?.input

        if (!input) return
        const { uri } = input as vscode.TabInputText
        await vscode.window.showTextDocument(uri)
    }

    const disposables: vscode.Disposable[] = []
    let updateDecorations: (uris?: vscode.Uri[]) => void | undefined

    const register = () => {
        const mode = getExtensionSetting('features.showTabNumbers')
        const isByRecentMode = oneOf(mode, 'recentlyOpened', 'recentlyFocused')
        // for recentByMode
        const recentFileStack: vscode.Uri[] = proxy([])
        disposables.push(
            vscode.commands.registerCommand(getExtensionCommandId('focusTabByNumber'), async number => {
                if (mode === 'disabled') {
                    void vscode.window.showWarningMessage('features.showTabNumbers setting is disabled')
                    return
                }

                const index = number - 1
                if (mode === 'fromLeft') await focusTabFromLeft(index)
                // eslint-disable-next-line sonarjs/no-duplicate-string
                const tabUriToFocus = (getExtensionSetting('showTabNumbers.reversedMode') ? [...recentFileStack].reverse() : recentFileStack)[index]
                if (!tabUriToFocus) return
                const tabUri = findCustomArray(vscode.window.tabGroups.all as vscode.TabGroup[], tabGroup =>
                    findCustomArray(tabGroup.tabs as vscode.Tab[], tab => {
                        if (!(tab.input instanceof vscode.TabInputText)) return
                        const { uri } = tab.input
                        return uri.toString() === tabUriToFocus.toString() && uri
                    }),
                )
                if (!tabUri) return
                await vscode.window.showTextDocument(tabUri)
            }),
        )
        if (mode === 'disabled') return
        const humanReadableMode = noCase(mode)

        class FileDecorationProvider implements vscode.FileDecorationProvider {
            eventEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>()
            onDidChangeFileDecorations = this.eventEmitter.event

            constructor() {
                subscribe(recentFileStack, () => {
                    this.eventEmitter.fire(recentFileStack)
                })
                updateDecorations = uris => {
                    this.eventEmitter.fire(uris ?? recentFileStack)
                }
            }

            provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
                const getBadge = (tabNumber: number) =>
                    ({
                        numberOnly: `${tabNumber}`,
                        numberWithPrefix: `t${tabNumber}`,
                    })[getExtensionSetting('showTabNumbers.badgeText')]

                if (!isByRecentMode) {
                    const { tabs } = vscode.window.tabGroups.activeTabGroup
                    const tabIndex = tabs
                        .filter(tab => tab.input instanceof vscode.TabInputText)
                        .findIndex(({ input }) => {
                            const { uri: tabUri } = input as vscode.TabInputText
                            return tabUri.toString() === uri.toString()
                        })
                    if (tabIndex === -1) return
                    const tabNumber = tabIndex + 1

                    return {
                        badge: getBadge(tabNumber),
                        tooltip: `${tabNumber} ${humanReadableMode}`,
                    }
                }

                const tabIndex = (getExtensionSetting('showTabNumbers.reversedMode') ? [...recentFileStack].reverse() : recentFileStack).findIndex(
                    elemUri => elemUri.toString() === uri.toString(),
                )
                if (tabIndex === -1) return
                const tabNumber = tabIndex + 1
                return {
                    badge: getBadge(tabNumber),
                    propagate: false,
                    tooltip: `${tabNumber}: by ${humanReadableMode}`,
                }
            }
        }
        disposables.push(vscode.window.registerFileDecorationProvider(new FileDecorationProvider()))
        if (!isByRecentMode) {
            disposables.push(
                vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
                    const tabsToUri = (tabs: readonly vscode.Tab[]) =>
                        compact(
                            tabs.map(({ input }) => {
                                if (!(input instanceof vscode.TabInputText)) return
                                return input.uri
                            }),
                        )
                    const allCurrentTabsUris = tabsToUri(vscode.window.tabGroups.activeTabGroup.tabs)
                    const closedTabsUris = tabsToUri(closed)

                    updateDecorations([...allCurrentTabsUris, ...closedTabsUris])
                }),
            )
            return
        }

        disposables.push(
            vscode.window.onDidChangeActiveTextEditor(textEditor => {
                if (!textEditor || textEditor.viewColumn === undefined) return
                const { uri } = textEditor.document
                if (uri.scheme === 'search-editor') return

                const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === uri.toString())
                if (elemIndex === -1 && recentFileStack.length < 9) {
                    recentFileStack.unshift(uri)
                    return
                }

                let deletedUri: vscode.Uri | undefined
                if (elemIndex === -1 && mode === 'recentlyOpened') {
                    deletedUri = recentFileStack.pop()
                    recentFileStack.unshift(uri)
                }

                if (mode === 'recentlyFocused') {
                    deletedUri = recentFileStack.splice(elemIndex, 1)[0]
                    recentFileStack.unshift(uri)
                }

                if (deletedUri) updateDecorations([deletedUri])
            }),
            vscode.workspace.onDidCloseTextDocument(document => {
                const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === document.uri.toString())
                if (elemIndex === -1) return
                recentFileStack.splice(elemIndex, 1)
                updateDecorations([document.uri])
            }),
        )
    }

    register()

    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        if (affectsConfiguration(getExtensionSettingId('features.showTabNumbers'))) {
            vscode.Disposable.from(...disposables).dispose()
            register()
        }

        if (affectsConfiguration(getExtensionSettingId('showTabNumbers.reversedMode'))) updateDecorations()
        if (affectsConfiguration(getExtensionSettingId('showTabNumbers.badgeText'))) updateDecorations()
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
