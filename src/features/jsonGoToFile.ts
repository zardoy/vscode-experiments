import * as vscode from 'vscode'
import { getJsonCompletingInfo } from '@zardoy/vscode-utils/build/jsonCompletions'
import { getLocation } from 'jsonc-parser'
import { getExtensionSetting } from 'vscode-framework'
import { type URI, Utils } from 'vscode-uri'
import { fsExists } from '@zardoy/vscode-utils/build/fs'

export default () => {
    let goToFile = getExtensionSetting('goToFileJson')
    if (goToFile === 'never') return
    vscode.languages.registerDefinitionProvider(['json', 'jsonc'], {
        async provideDefinition(document, position, token) {
            goToFile = getExtensionSetting('goToFileJson')
            if (goToFile === 'never') return
            const text = document.getText()
            const offset = document.offsetAt(position)
            const location = getLocation(text, offset)
            if (!location.previousNode) return
            const { insideStringRange } = getJsonCompletingInfo(location, document, position) || {}
            if (!insideStringRange) return
            const { value } = location.previousNode
            let fileUri: URI | undefined
            if (value === '/' || value === '\\') fileUri = vscode.Uri.file(value)
            else if (value.startsWith('./') || value.startsWith('../')) fileUri = Utils.joinPath(document.uri, '..', value.slice(2))
            if (!fileUri) return
            if (goToFile === 'onlyIfExists' && !(await fsExists(fileUri))) return /* throw new Error('File does not exist') */
            return [
                {
                    targetRange: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)),
                    targetUri: fileUri,
                    originSelectionRange: insideStringRange,
                },
            ]
        },
    })
}
