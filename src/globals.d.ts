type Feature = {
    default?: () => void | Array<import('vscode').Disposable>
    enableIf?: keyof import('vscode-framework').Settings
}

declare global {
    type Feature = Feature
}

declare module 'all-features-index' {
    const obj = {} as Record<string, Feature>
    export = obj
}
