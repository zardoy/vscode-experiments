import * as vscode from 'vscode'
import { getExtensionSetting } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('features.collapseNodeModules')) return
    vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
        const nodeModulesTab = (tab: vscode.Tab) => {
            const { uri } = tab.input as { uri: vscode.Uri }
            if (!uri) return
            return uri.scheme === 'file' && uri.path.includes('node_modules')
        }

        const closedSome = closed.some(nodeModulesTab)
        // wait open event e.g. on selecting files in preview: close -> open immediately
        setTimeout(async () => {
            const remaining = vscode.window.tabGroups.all.every(tabGroup => tabGroup.tabs.every(tab => !nodeModulesTab(tab)))
            // eslint-disable-next-line curly
            if (closedSome && remaining) {
                await vscode.commands.executeCommand('workbench.files.action.collapseExplorerFolders')
            }
        })
    })
}
