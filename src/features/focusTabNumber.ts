import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export default () => {
    if (!getExtensionSetting('features.showTabNumbers')) return
    registerExtensionCommand('focusTabByNumber', () => {})
}
