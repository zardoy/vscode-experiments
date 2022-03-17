import fs from 'fs'
import { join } from 'path'
import minimatch from 'minimatch'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { decode as decodeIni } from 'ini'

// TODO global git hook
export const registerEnsureGitUser = () => {
    registerExtensionCommand('ensureGitUser', () => {
        const workspaceRoot = getCurrentWorkspaceRoot()
        if (!workspaceRoot) return
        const ensureGitUserSetting = getExtensionSetting('ensureGitUser')
        for (const [pattern, expected] of Object.entries(ensureGitUserSetting))
            if (minimatch(workspaceRoot.uri.fsPath, pattern)) {
                const data = decodeIni(fs.readFileSync(join(workspaceRoot.uri.fsPath, '.git/config'), 'utf-8'))
                if (!data.user) throw new Error('User not even configured')
                const fullStr = `${data.user.name} <${data.user.email}>`
                if (fullStr !== expected) throw new Error(`.git/config user ${fullStr} doesn't match ${expected}`)
                break
            }
    })
}
