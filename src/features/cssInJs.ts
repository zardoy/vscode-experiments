import * as vscode from 'vscode'
import { registerTextEditorCommand } from '@zardoy/vscode-utils/build/commands'
import { noCase } from 'change-case'
import { getExtensionCommandId, registerExtensionCommand, showQuickPick } from 'vscode-framework'
import postcssJs from 'postcss-js'
import postcss from 'postcss'

export default () => {
    registerTextEditorCommand('fixCssInJs', async (editor, _, mode) => {
        const commands = ['fixCssToJs', 'fixJsToCss']
        let command: string | undefined
        if (mode === 'auto')
            command =
                editor.document.languageId === 'css' || editor.document.languageId === 'scss' || editor.document.languageId === 'less'
                    ? 'fixCssToJs'
                    : 'fixJsToCss'
        else
            command = await showQuickPick(
                commands.map(command => ({
                    label: noCase(command),
                    value: command,
                })),
            )

        if (!command) return
        await vscode.commands.executeCommand(getExtensionCommandId(command as any))
    })

    registerTextEditorCommand('fixJsToCss', async editor => {
        let text = editor.document.getText(editor.selection)
        if (!text.trim()) return
        const transformJsPropToCss = (prop: string) => {
            const converted = prop.replaceAll(/([A-Z])/g, '-$1').toLowerCase()
            return converted
        }

        text = text.replaceAll(/(\w+)(: )/gi, (_, prop, after) => {
            const converted = transformJsPropToCss(prop)
            return `${converted}${after}`
        })
        text = text.replaceAll(/: (.*?),?(\r?\n|$)/g, (_, value, ending) => {
            let converted = Number.isNaN(Number(value)) ? value : `${value}px`
            if (converted.startsWith("'") || converted.startsWith('"')) converted = converted.slice(1, -1)
            return `: ${converted};${ending ?? ''}`
        })
        await editor.edit(edit => edit.replace(editor.selection, text))
    })
    registerTextEditorCommand('fixCssToJs', async editor => {
        const text = editor.document.getText(editor.selection)
        if (!text.trim()) return
        const root = postcss.parse(text)

        const patch = input => {
            if (typeof input === 'object') {
                const result = {}
                for (const key of Object.keys(input)) result[key] = patch(input[key])

                return result
            }

            if (typeof input === 'string') {
                const pxMatch = /^(\d+)px$/.exec(input)
                return pxMatch ? +pxMatch[1]! : input
            }

            return input
        }

        // eslint-disable-next-line import/no-named-as-default-member
        const transformed = JSON.stringify(patch(postcssJs.objectify(root)), null, '\t')
        await editor.edit(edit => edit.replace(editor.selection, transformed.slice(1, -1)))
    })
    // todo suggest file imports
}
