import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { signInToGithub } from '../util'

async function getAuthorizedOctokit(scopes) {
    // return new Octokit({
    //     auth: token,
    // })
}

export default () => {
    registerExtensionCommand('openGithubEnvTerminal', async (_, scopes = ['repo']) => {
        const token = await signInToGithub(scopes)
        const terminal = vscode.window.createTerminal({
            env: {
                GITHUB_TOKEN: token,
            },
            name: 'GITHUB_TOKEN terminal',
        })
        terminal.show()
    })
}
