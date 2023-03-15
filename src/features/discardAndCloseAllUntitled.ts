/* eslint-disable no-await-in-loop */
import { commands, TabInputText, window } from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('discardAndCloseAllUntitled', async (_, /* With this arg it actually can be used to not discard */ onlyEmpty = false) => {
        const {
            activeTabGroup: { tabs: activeGroupTabs, activeTab },
        } = window.tabGroups
        const activeTabUri = activeTab?.input instanceof TabInputText && activeTab.input.uri.scheme === 'untitled' ? activeTab.input.uri : undefined
        for (const tab of activeGroupTabs)
            if (tab.input instanceof TabInputText && tab.input.uri.scheme === 'untitled' && !tab.isPinned && (!onlyEmpty || !tab.isDirty)) {
                await window.showTextDocument(tab.input.uri)
                await commands.executeCommand('workbench.action.revertAndCloseActiveEditor')
            }

        if (activeTabUri) await window.showTextDocument(activeTabUri)
    })
}
