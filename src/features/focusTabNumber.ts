import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export default () => {
    const focusTabFromLeft = async (number: number) => {
        const tabDocument = vscode.window.tabGroups.activeTabGroup.tabs[number]?.input as vscode.TextDocument | undefined
        if (!tabDocument) return
        await vscode.window.showTextDocument(tabDocument)
    };

    registerExtensionCommand('focusTabByNumberFromLeft', async (_, number) => focusTabFromLeft(number))
    const mode = getExtensionSetting('features.showTabNumbers');
    if (mode === 'disabled') return
    registerExtensionCommand('focusTabByNumber', () => {})
}
