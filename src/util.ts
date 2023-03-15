import * as vscode from 'vscode'
import { GracefulCommandError } from 'vscode-framework'

export const noWebSupported = () => {
    void vscode.window.showWarningMessage('This command is not supported in the web')
}

export const signInToGithub = async (scopes: string[]) => {
    try {
        const session = await vscode.authentication.getSession('github', scopes, { createIfNone: true })
        return session.accessToken
    } catch {
        throw new GracefulCommandError('You need to sign-in with GitHub to perform this operation')
    }
}

export const controlledPromise = <T>() => {
    const listeners: Array<(resolved: T) => any> = []
    let resolved: any
    return {
        then(listener: (resolved: T) => any) {
            if (resolved) listener(resolved)
            else listeners.push(listener)
        },
        resolve(arg: T) {
            resolved = arg
            for (const listener of listeners) listener(arg)
        },
    }
}
