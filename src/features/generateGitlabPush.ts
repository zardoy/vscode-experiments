import * as vscode from 'vscode'
import { getExtensionContributionsPrefix, getExtensionSetting, registerExtensionCommand, RegularCommands } from 'vscode-framework'

export default () => {
    registerExtensionCommand('generateGitlabPush', async () => {
        // https://docs.gitlab.com/ee/user/project/push_options.html

        const quickPick = vscode.window.createQuickPick()

        const dynamicPushOptions = getExtensionSetting('generateGitlabPush.dynamicPushOptions') as Record<string, string>
        const staticPushOptions = getExtensionSetting('generateGitlabPush.staticPushOptions') as Record<string, boolean>

        let editingIndex: number | undefined

        const pushOptions = {
            dynamicPushOptions,
            staticPushOptions,
        }
        const getOptionsNames = () => [...Object.keys(pushOptions.dynamicPushOptions), ...Object.keys(pushOptions.staticPushOptions)]

        const updateMainTitle = () => {
            quickPick.title = `git push ${normallizeDynamicOptions(pushOptions.dynamicPushOptions)} -o ${normallizeStaticOptions(
                pushOptions.staticPushOptions,
            )}`
        }

        const setActiveItem = (existingIndex: number) => {
            // do it in next loop after items update (most probably)
            setTimeout(() => {
                quickPick.activeItems = [quickPick.items[existingIndex]!]
            })
        }

        const resetItems = () => {
            quickPick.items = [...Object.keys(pushOptions.dynamicPushOptions), ...Object.keys(pushOptions.staticPushOptions)].map(option => ({ label: option }))
            if (editingIndex !== undefined) setActiveItem(editingIndex)
            updateMainTitle()
            editingIndex = undefined
        }

        const normallizeStaticOptions = staticOptions => Object.keys(staticOptions).join(' -o ')
        const normallizeDynamicOptions = dynamicOption =>
            Object.entries(dynamicOption)
                .filter(([, value]) => value)
                .map(([key, value]) => `-o ${key}=${value}`)
                .join(' ')

        const updatePushOption = (option: string, value: string) => {
            if (option in pushOptions.dynamicPushOptions) pushOptions.dynamicPushOptions[option] = value
        }

        const registerCommand = (command: keyof RegularCommands, handler: () => void) =>
            vscode.commands.registerCommand(`${getExtensionContributionsPrefix()}${command}`, handler)

        const mainDisposable = vscode.Disposable.from(
            quickPick,
            registerCommand('generateGitlabPushAccept', () => {
                if (!quickPick.title) return

                const terminal = vscode.window.createTerminal()
                terminal.sendText(quickPick.title)
                terminal.show()
                // dispose terminal in success cases?
                // terminal.dispose()
            }),
            {
                dispose() {
                    void vscode.commands.executeCommand('setContext', 'zardoyExperiments.generateGitlabPushOpened', false)
                },
            },
        )

        quickPick.onDidAccept(() => {
            const activeItem = quickPick.activeItems[0]!
            if (editingIndex === undefined) {
                if (!activeItem) return
                editingIndex = quickPick.items.indexOf(activeItem)
                const { label } = activeItem
                const editingOption = [...Object.entries(pushOptions.dynamicPushOptions), ...Object.entries(pushOptions.dynamicPushOptions)].find(
                    ([option, value]) => option === label,
                )!
                quickPick.items = []
                quickPick.title = `Changing option: ${label}`
                quickPick.value = editingOption[1]
                return
            }

            const changingOption = getOptionsNames()[editingIndex]!
            updatePushOption(changingOption, quickPick.value)
            resetItems()
            quickPick.value = ''
        })

        quickPick.onDidHide(() => {
            mainDisposable.dispose()
        })
        await vscode.commands.executeCommand('setContext', 'zardoyExperiments.generateGitlabPushOpened', true)
        resetItems()
        quickPick.show()
    })
}
