import { getExtensionSetting } from 'vscode-framework'

export default () => {
    const enable = getExtensionSetting('enableExperimentalIntegrationsWithTsPlugin')
    if (!enable) return
}
