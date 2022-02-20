import * as vscode from 'vscode'
import { CamelCase, Split, Join } from 'type-fest'
import { getExtensionSetting, Settings } from 'vscode-framework'
import { camelCase } from 'change-case'

// TODO simplify
type DotToCamelCase<T extends Record<string, any>> = { [K in keyof T as CamelCase<Join<Split<K & string, '.'>, '-'>>]: T[K] }

// TODO move to core
export const registerWithSetting = <T extends keyof Settings>(
    settings: T[],
    callback: (settigns: DotToCamelCase<Pick<Settings, T>>) => vscode.Disposable | void,
) => {
    const retrieveConfig = () => Object.fromEntries(settings.map(setting => [camelCase(setting), getExtensionSetting(setting)]))
    let disposable: void | vscode.Disposable
    const callCallback = () => {
        if (disposable) disposable.dispose()
        disposable = callback(retrieveConfig())
    }

    callCallback()
    vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
        console.log('check', settings)
        if (settings.some(setting => affectsConfiguration(setting))) callCallback()
    })
}
