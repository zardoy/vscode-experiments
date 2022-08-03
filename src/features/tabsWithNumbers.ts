import * as vscode from 'vscode'
import { oneOf, findCustomArray } from '@zardoy/utils'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { noCase } from 'change-case'
import { proxy, subscribe } from 'valtio/vanilla'

// TODO add color settings
export default () => {
    const focusTabFromLeft = async (index: number) => {
        const tabDocument = vscode.window.tabGroups.activeTabGroup.tabs[index]?.input as vscode.TextDocument | undefined
        if (!tabDocument) return
        await vscode.window.showTextDocument(tabDocument)
    }

    const mode = getExtensionSetting('features.showTabNumbers')
    const recentByMode = oneOf(mode, 'recentlyOpened', 'recentlyFocused')
    // for recentByMode
    const recentFileStack: vscode.Uri[] = proxy([])
    registerExtensionCommand('focusTabByNumber', async (_, number) => {
        if (mode === 'disabled') {
            void vscode.window.showWarningMessage('features.showTabNumbers setting is disabled')
            return
        }

        const index = number - 1
        if (mode === 'fromLeft') await focusTabFromLeft(index)
        const tabUriToFocus = recentFileStack[index]
        if (!tabUriToFocus) return
        const tabDocument = findCustomArray(vscode.window.tabGroups.all as vscode.TabGroup[], tabGroup =>
            findCustomArray(tabGroup.tabs as vscode.Tab[], tab => {
                const document = tab.input as vscode.TextDocument | undefined
                return document?.uri.toString() === tabUriToFocus.toString() && document
            }),
        )
        if (!tabDocument) return
        await vscode.window.showTextDocument(tabDocument)
    })
    if (mode === 'disabled') return
    const humanReadableMode = noCase(mode)

    class FileDecorationProvider implements vscode.FileDecorationProvider {
        listeners: Array<(e: vscode.Uri | vscode.Uri[] | undefined) => any> = []

        constructor() {
            subscribe(recentFileStack, ops => {
                // TODO!! update from ops if was deleted
                // const uris = ops.map(op => {
                //     const uri = op[2]! as vscode.Uri
                //     return uri
                // })
                for (const listener of this.listeners) listener(recentFileStack)
            })
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

            const tabIndex = recentFileStack.findIndex((elemUri, index) => elemUri.toString() === uri.toString())
            if (tabIndex === -1) return
            const tabNumber = tabIndex + 1
            return {
                badge: `${tabNumber}`,
                propagate: false,
                tooltip: `${tabNumber}: by ${humanReadableMode}`,
            }
        }
    }
    vscode.window.registerFileDecorationProvider(new FileDecorationProvider())
    if (!recentByMode) return
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
    })
    vscode.workspace.onDidCloseTextDocument(document => {
        const elemIndex = recentFileStack.findIndex(tabUri => tabUri.toString() === document.uri.toString())
        if (elemIndex === -1) return
        recentFileStack.splice(elemIndex, 1)
    })
}
