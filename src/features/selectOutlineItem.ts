import * as vscode from 'vscode'
import { findCurrentEditorOutlineItem } from '@zardoy/vscode-utils/build/outline'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('selectOutlineItem', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const outline = await findCurrentEditorOutlineItem()
        if (!outline) return
        const rangeStart = outline.range.start
        const rangeEnd = outline.range.end
        activeTextEditor.selection = new vscode.Selection(rangeStart, rangeEnd)
    })
}
