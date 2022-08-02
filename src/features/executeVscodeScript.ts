import { registerExtensionCommand } from 'vscode-framework'
import { noWebSupported } from '../util'

export default () => {
    registerExtensionCommand('executeVscodeScript', async () => {
        if (process.env.PLATFORM === 'web') {
            noWebSupported()
        } else {
            const { execa } = await import('execa')
            // execa('tsc', [''])
        }
    })
}
