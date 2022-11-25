import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    const outlineUtilsId = 'zardoy.outline-utils'

    const REMOVED_COMMANDS: Array<[string, string, string]> = [
        ['selectOutlineItem', 'outlineUtils.selectOutlineItem', outlineUtilsId],
        ['copyOutlineItemName', 'outlineUtils.copyOutlineItemName', outlineUtilsId],
        ['copyCurrentOutlinePath', 'outlineUtils.copyCurrentOutlinePath', outlineUtilsId],
        ['openOutlineItemInNewEditor', 'outlineUtils.openOutlineItemInNewEditor', outlineUtilsId],
    ]

    // eslint-disable-next-line curly
    for (const [removedCommand, replacedCommand, extensionOwner] of REMOVED_COMMANDS) {
        registerExtensionCommand(removedCommand as any, async (_, ...args) => {
            try {
                return await vscode.commands.executeCommand<any>(replacedCommand, ...args)
            } catch (error) {
                if (error?.message === `command '${replacedCommand}' not found`) {
                    const action = await vscode.window.showWarningMessage(
                        `${removedCommand} was migrated to ${extensionOwner}. You probably need to enable or install it first.`,
                        'Show extension',
                    )
                    if (action === 'Show extension') await vscode.commands.executeCommand('workbench.extensions.action.showReleasedVersion', extensionOwner)
                }
            }
        })
    }
}
