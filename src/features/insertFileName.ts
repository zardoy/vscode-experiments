import { Range, SnippetString } from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'
import { Utils as UriUtils } from 'vscode-uri'
import { extname } from 'path-browserify'

export default () => {
    registerExtensionCommand('insertFileName', () => {
        const editor = getActiveRegularEditor()
        if (!editor) return
        const pos = editor.selection.active
        const fullFileName = UriUtils.basename(editor.document.uri)
        let fileName = fullFileName
        // cut extension twice e.g. file.test.ts -> file & .test.ts
        for (const _i of Array.from({ length: 2 })) {
            const ext = extname(fileName)
            if (ext.length === 0) continue
            fileName = fileName.slice(0, -ext.length)
        }

        if (!fileName) return
        const doCapitalize = pos.character && /\w/.test(editor.document.getText(new Range(pos.translate(0, -1), pos)))
        void editor.insertSnippet(new SnippetString(doCapitalize ? fileName[0]!.toUpperCase() + fileName.slice(1) : fileName))
    })
}
