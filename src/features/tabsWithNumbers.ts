import * as vscode from 'vscode'
import { oneOf, findCustomArray, compact } from '@zardoy/utils'
import { getExtensionCommandId, getExtensionSetting, getExtensionSettingId, registerExtensionCommand, RegularCommands } from 'vscode-framework'
import { noCase } from 'change-case'
import { proxy, subscribe } from 'valtio/vanilla'
import { range } from 'rambda'

export default () => {
    const focusTabFromLeft = async (index: number) => {
        const tabDocument = vscode.window.tabGroups.activeTabGroup.tabs[index]?.input as vscode.TextDocument | undefined
        if (!tabDocument) return
        await vscode.window.showTextDocument(tabDocument)
    }

    const disposables: vscode.Disposable[] = []
    let updateDecorations: () => void | undefined
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
                const tabDocument = findCustomArray(vscode.window.tabGroups.all as vscode.TabGroup[], tabGroup =>
                    findCustomArray(tabGroup.tabs as vscode.Tab[], tab => {
                        const document = tab.input as vscode.TextDocument | undefined
                        return document?.uri.toString() === tabUriToFocus.toString() && document
                    }),
                )
                if (!tabDocument) return
                await vscode.window.showTextDocument(tabDocument)
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
                updateDecorations = () => {
                    for (const listener of this.listeners) listener(recentFileStack)
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
                        const document = tab.input as vscode.TextDocument | undefined
                        return document?.uri.toString() === uri.toString()
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
        if (!recentByMode) return
        disposables.push(
            vscode.window.onDidChangeActiveTextEditor(textEditor => {
                if (!textEditor || textEditor.viewColumn === undefined) return
                const { uri } = textEditor.document
                const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === uri.toString())
                if (elemIndex === -1) {
                    recentFileStack.unshift(uri)
                    return
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
