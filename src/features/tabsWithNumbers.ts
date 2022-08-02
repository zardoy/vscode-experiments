import * as vscode from 'vscode'
import { oneOf, findCustomArray } from '@zardoy/utils'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { noCase } from 'change-case'
import { proxy, subscribe } from 'valtio/vanilla'

// TODO add color settings
// TODO! +1
export default () => {
    const focusTabFromLeft = async (number: number) => {
        const tabDocument = vscode.window.tabGroups.activeTabGroup.tabs[number]?.input as vscode.TextDocument | undefined
        if (!tabDocument) return
        await vscode.window.showTextDocument(tabDocument)
    }

    registerExtensionCommand('focusTabByNumberFromLeft', async (_, number) => focusTabFromLeft(number))
    const mode = getExtensionSetting('features.showTabNumbers')
    if (mode === 'disabled') return
    const recentByMode = oneOf(mode, 'recentlyOpened', 'recentlyFocused')
    // for recentByMode
    const recentFileStack: vscode.Uri[] = proxy([])
    registerExtensionCommand('focusTabByNumber', async (_, number) => {
        if (mode === 'fromLeft') await focusTabFromLeft(number)
        const tabUriToFocus = recentFileStack[number]
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
    const humanReadableMode = noCase(mode)

    class FileDecorationProvider implements vscode.FileDecorationProvider {
        listeners: Array<(e: vscode.Uri | vscode.Uri[] | undefined) => any> = []

        constructor() {
            subscribe(recentFileStack, op => {
                console.log('changed', op)
                // for (const listener of this.listeners) listener(data)
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
                return {
                    badge: '',
                    tooltip: `${tabIndex} ${humanReadableMode}`,
                }
            }

            const tabIndex = recentFileStack.findIndex((elemUri, index) => elemUri.toString() === uri.toString())
            if (tabIndex === -1) return
            return {
                badge: `${tabIndex}`,
                propagate: false,
                tooltip: `${tabIndex}: by ${humanReadableMode}`,
            }
        }
    }
    vscode.window.registerFileDecorationProvider(new FileDecorationProvider())
    if (!recentByMode) return
    vscode.window.onDidChangeActiveTextEditor(textEditor => {
        console.log('switch text editor', textEditor?.document.uri.toString())
        if (!textEditor || textEditor.viewColumn === undefined) return
        const { uri } = textEditor.document
        const elemIndex = recentFileStack.indexOf(uri)
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
        console.log('close document', document.uri.toString())
        const elemIndex = recentFileStack.indexOf(document.uri)
        if (elemIndex === -1) return
        recentFileStack.splice(elemIndex, 1)
    })
}
