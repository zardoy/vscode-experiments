/* eslint-disable no-await-in-loop */
import { commands, TabInputText, window } from 'vscode'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'
import { Utils } from 'vscode-uri'

export default () => {
    registerExtensionCommand('selectTabsToKeepOpen', async (_, revert = false) => {
        const tabs = window.tabGroups.activeTabGroup.tabs.filter(tab => !tab.isPinned && (revert || !tab.isDirty))
        const getDescriptionForTab = (tab: (typeof tabs)[0]) => {
            let text = ''
            if (tab.input instanceof TabInputText) {
                const { uri } = tab.input
                text += Utils.basename(uri)
                if (window.activeTextEditor?.document.uri.toString() === uri.toString()) text += ' (active)'
            }

            text += ` (${tab.isDirty ? 'dirty' : 'saved'})`
            return text
        }

        const selectedTabs = await showQuickPick(
            tabs.map(tab => ({
                label: tab.label,
                description: getDescriptionForTab(tab),
                value: tab,
            })),
            {
                canPickMany: true,
                title: 'Close all tabs except selected',
                matchOnDescription: true,
            },
        )
        if (!selectedTabs) return
        await Promise.all(selectedTabs.filter(({ isDirty }) => !isDirty).map(tab => window.tabGroups.close(tab)))
        if (revert) {
            for (const tab of selectedTabs.filter(({ isDirty }) => isDirty)) {
                if (!(tab.input instanceof TabInputText)) continue
                await window.showTextDocument(tab.input.uri)
                await commands.executeCommand('workbench.action.revertAndCloseActiveEditor')
            }
        }
    })
    registerExtensionCommand('selectTabsToKeepOpenRevert', _ => commands.executeCommand(getExtensionCommandId('selectTabsToKeepOpen'), true) as any)
}
