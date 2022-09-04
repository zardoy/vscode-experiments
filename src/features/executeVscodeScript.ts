import { registerExtensionCommand } from 'vscode-framework'
import { noWebSupported } from '../util'

export default () => {
    registerExtensionCommand('executeVscodeScript', async () => {
        if (process.env.PLATFORM === 'web') {
            noWebSupported()
        } else {
            const { tmpdir } = await import('os')
            const { join } = await import('path/posix')
            const { execa } = await import('execa')
            const { existsSync, readdirSync, mkdirSync, writeFileSync } = await import('fs')
            const dir = join(tmpdir(), 'vscode-exec-script')
            if (!existsSync(dir)) mkdirSync(dir)(readdirSync(dir).slice(-1)[0])
            // execa('tsc', [''])
        }
    })
}
