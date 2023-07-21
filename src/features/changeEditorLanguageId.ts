import * as vscode from 'vscode'

import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    // api command simply because workbench.action.editor.changeLanguageMode doesn't support arg
    registerExtensionCommand('changeEditorLanguageId' as any, async (_, languageId) => {
        if (!languageId) throw new Error('languageId is required as arg')
        const editor = getActiveRegularEditor()
        if (!editor) return
        await vscode.languages.setTextDocumentLanguage(editor.document, languageId)
    })
}
