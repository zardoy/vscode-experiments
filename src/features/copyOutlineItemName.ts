import * as vscode from 'vscode'
import { findCurrentEditorOutlineItem } from '@zardoy/vscode-utils/build/outline'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyOutlineItemName', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const outline = await findCurrentEditorOutlineItem()
        if (!outline) return
        await vscode.env.clipboard.writeText(outline.name)
    })
}
