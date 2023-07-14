import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand, setDebugEnabled } from 'vscode-framework'
import { range } from 'rambda'
import * as allFeatures from 'all-features-index'
import { initGitApi } from './git-api'
import removedCommands from './removedCommands'

export const activate = () => {
    void initGitApi()
    removedCommands()

    for (const registerFeature of Object.values(allFeatures)) registerFeature?.()

    if (process.env.PLATFORM === 'node') void import('./features/inspectCompletionsDetails').then(({ default: d }) => d())

    registerExtensionCommand('fixedTerminalMaximize', async () => {
        await vscode.commands.executeCommand('workbench.action.toggleMaximizedPanel')
        await new Promise(resolve => {
            setTimeout(resolve, 50)
        })
        await vscode.commands.executeCommand('workbench.action.terminal.scrollUpPage')
        // eslint-disable-next-line no-await-in-loop
        for (const i of range(0, 3)) await vscode.commands.executeCommand('workbench.action.terminal.scrollDown')
    })

    if (getExtensionSetting('enableDebug')) setDebugEnabled(true)
}
