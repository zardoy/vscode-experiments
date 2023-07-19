import * as vscode from 'vscode'
import { getExtensionSetting, getExtensionSettingId, registerExtensionCommand, setDebugEnabled } from 'vscode-framework'
import { range } from 'rambda'
import * as allFeatures from 'all-features-index'
import { initGitApi } from './git-api'
import removedCommands from './removedCommands'

export const activate = () => {
    void initGitApi()
    removedCommands()

    const optionalFeaturesRegistry: Array<[setting: string, module: Feature, result: vscode.Disposable[] | undefined | null]> = []

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const registerFeature = (module: Feature) => module.default!() ?? null

    for (const module of Object.values(allFeatures)) {
        if (!module.default) continue
        const { enableIf } = module
        if (enableIf) {
            optionalFeaturesRegistry.push([enableIf, module, undefined])
            if (getExtensionSetting(enableIf)) optionalFeaturesRegistry.at(-1)![2] = registerFeature(module)
        } else {
            module.default()
        }
    }

    vscode.workspace.onDidChangeConfiguration(async ({ affectsConfiguration }) => {
        for (const registryEntry of optionalFeaturesRegistry) {
            const [setting, module, disposables] = registryEntry
            if (!affectsConfiguration(getExtensionSettingId(setting as any))) continue
            if (disposables) {
                vscode.Disposable.from(...disposables).dispose()
            } else if (disposables === null) {
                // null means it's enabled and has no disposables, so we can unregister
                const choice = await vscode.window.showInformationMessage('Click button to apply setting', 'Restart host')
                if (choice) await vscode.commands.executeCommand('workbench.action.restartExtensionHost')

                return
            }

            const enabled = getExtensionSetting(setting as any)
            if (enabled) registryEntry[2] = registerFeature(module)
        }
    })

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
