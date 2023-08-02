import * as vscode from 'vscode'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'

import { extensionCtx, getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'
import { Utils } from 'vscode-uri'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import stripJsonComments from 'strip-json-comments'
import * as jsoncParser from 'jsonc-parser'

// memoize per project
export default () => {
    type State = [lastConfigName: string, pinned: boolean]

    registerExtensionCommand('debugRememberedConfiguration', async (_, showSelector = true) => {
        const workspace = getCurrentWorkspaceRoot()
        const getName = async () => {
            const [lastConfigName, pinned] = extensionCtx.workspaceState.get('debugRememberedConfiguration', ['', false] as State)
            const config = await vscode.workspace.fs.readFile(Utils.joinPath(workspace.uri, '.vscode/launch.json')).then(b => jsoncParser.parse(b.toString()))
            const configNames: string[] = [config.compounds, config.configurations].filter(Boolean).flatMap((configs: any) => configs.map(c => c.name))
            if (showSelector) {
                const pinButton = {
                    tooltip: 'Pin Choice',
                    iconPath: new vscode.ThemeIcon('pin'),
                }
                const selected = await showQuickPick(
                    configNames.map(configName => ({
                        label: configName,
                        value: configName,
                        buttons: pinned ? [] : [pinButton],
                    })),
                    {
                        title: 'Select debug configuration',
                        buttons: pinned
                            ? [
                                  {
                                      tooltip: 'Unpin Choice',
                                      iconPath: new vscode.ThemeIcon('timeline-unpin'),
                                  },
                              ]
                            : [],
                        initialSelectedIndex: configNames.indexOf(lastConfigName),
                        onDidTriggerButton() {
                            void extensionCtx.workspaceState.update('debugRememberedConfiguration', [lastConfigName, false])
                            this.hide()
                            void vscode.commands.executeCommand(getExtensionCommandId('debugRememberedConfiguration'), showSelector)
                        },
                        onDidTriggerItemButton(button) {
                            void extensionCtx.workspaceState.update('debugRememberedConfiguration', [button.item.value, true])
                            this.hide()
                            void vscode.commands.executeCommand(getExtensionCommandId('debugRememberedConfiguration'), showSelector)
                        },
                    },
                )
                if (!selected) return
                if (!pinned) void extensionCtx.workspaceState.update('debugRememberedConfiguration', [selected, pinned])
                return selected
            }

            return lastConfigName || configNames[0]
        }

        const name = await getName()
        if (!name) return
        await vscode.debug.startDebugging(workspace, name)
    })
}
