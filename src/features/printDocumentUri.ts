import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('printActiveDocumrntUri', () => {
        const editor = getActiveRegularEditor()
        console.log(editor?.document.uri)
    })
}
