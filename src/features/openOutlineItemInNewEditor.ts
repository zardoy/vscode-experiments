import * as vscode from 'vscode'
import { findCurrentEditorOutlineItem } from '@zardoy/vscode-utils/build/outline'
import { getExtensionContributionsPrefix, registerExtensionCommand } from 'vscode-framework'

// const SCHEME = `${getExtensionContributionsPrefix()}outlineItemPreview`

export default () => {
    registerExtensionCommand('openOutlineItemInNewEditor', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const { document } = activeTextEditor
        const outline = await findCurrentEditorOutlineItem()
        if (!outline) return
        await vscode.workspace.openTextDocument({
            content: document.getText(outline.range),
            language: document.languageId,
        })
    })
}
