import * as vscode from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'
import { selectLineContents } from './selectLineContents'
import { cutLineContents } from './cutLineContents'

export default () => {
    registerExtensionCommand('cutLineContentsPreserve', async () => cutLineContents(true))
}
