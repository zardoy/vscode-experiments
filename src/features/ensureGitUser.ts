import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { noWebSupported } from '../util'

// TODO global git hook
export const registerEnsureGitUser = () => {
    registerExtensionCommand('ensureGitUser', async () => {
        if (process.env.PLATFORM === 'web') {
            noWebSupported()
        } else {
            const minimatch = await import('minimatch')
            const { join } = await import('path')
            const fs = await import('fs')
            const { decode: decodeIni } = await import('ini')
            const workspaceRoot = getCurrentWorkspaceRoot()
            if (!workspaceRoot) return
            const ensureGitUserSetting = getExtensionSetting('ensureGitUser')
            for (const [pattern, expected] of Object.entries(ensureGitUserSetting))
                if (minimatch.default(workspaceRoot.uri.fsPath, pattern)) {
                    const data = decodeIni(fs.readFileSync(join(workspaceRoot.uri.fsPath, '.git/config'), 'utf-8'))
                    if (!data.user) throw new Error('User not even configured')
                    const fullStr = `${data.user.name} <${data.user.email}>`
                    if (fullStr !== expected) throw new Error(`.git/config user ${fullStr} doesn't match ${expected}`)
                    break
                }
        }
    })
}
