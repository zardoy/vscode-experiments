import { commands, TabInputTextDiff, window } from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('openOriginalFileFromDiff', async (_, command = 'git.openFile') => {
        const tab = window.tabGroups.activeTabGroup.activeTab
        if (!tab || !(tab.input instanceof TabInputTextDiff)) return
        await commands.executeCommand(command)
        await window.tabGroups.close(tab)
    })
}
