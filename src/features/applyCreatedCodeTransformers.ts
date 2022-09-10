import { getActiveRegularEditor, rangeToSelection } from '@zardoy/vscode-utils'
import { getExtensionSetting, registerExtensionCommand, showQuickPick } from 'vscode-framework'

export default () => {
    // default mode is line
    registerExtensionCommand('applyCreatedCodeTransformers', async (_, transformerName?: string) => {
        const editor = getActiveRegularEditor()
        if (!editor) return
        const createdCodeTransformers = getExtensionSetting('createdCodeTransformers')
        if (!transformerName)
            transformerName = await showQuickPick(
                Object.entries(createdCodeTransformers).map(([name, transformer]) => ({
                    label: name,
                    value: name,
                    description: transformer,
                })),
            )
        if (!transformerName) return
        const transformer = createdCodeTransformers[transformerName]!
        const regexp = new RegExp(transformer)
        void editor.edit(builder => {
            for (const { active } of editor.selections) {
                const range = editor.document.getWordRangeAtPosition(active, regexp)
                if (!range) continue
                const match = editor.document.getText(range).match(regexp)!
                let replaceString = ''
                // collect result from captured groups
                for (const [i, str] of match.entries()) {
                    if (i === 0) continue
                    replaceString += str
                }

                builder.replace(range, replaceString)
            }
        })
    })
}
