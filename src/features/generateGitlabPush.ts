import * as vscode from 'vscode'
import { getExtensionContributionsPrefix, getExtensionSetting, registerExtensionCommand, RegularCommands } from 'vscode-framework'

export default () => {
    registerExtensionCommand('generateGitlabPush', async () => {
        // https://docs.gitlab.com/ee/user/project/push_options.html

        const quickPick = vscode.window.createQuickPick()
        const { dynamicPushOptions = {}, staticPushOptions = {} } = getExtensionSetting('generateGitlabPush')

        let editingIndex: number | undefined

        const normallizeStaticOptions = () =>
            Object.keys(staticPushOptions)
                .map(key => ` -o ${key}`)
                .join('')
        const normallizeDynamicOptions = () =>
            Object.entries(dynamicPushOptions)
                .filter(([, value]) => value)
                .map(([key, value]) => ` -o ${key}=${value}`)
                .join('')

        const getOptionsNames = () => [...Object.keys(dynamicPushOptions), ...Object.keys(staticPushOptions)]

        const updateMainTitle = () => {
            quickPick.title = `git push${normallizeDynamicOptions()}${normallizeStaticOptions()}`
        }

        const setActiveItem = (existingIndex: number) => {
            // do it in next loop after items update (most probably)
            setTimeout(() => {
                quickPick.activeItems = [quickPick.items[existingIndex]!]
            })
        }

        const resetItems = () => {
            // Currently remove static options from quick pick as managing them looks tricky
            // quickPick.items = [...Object.keys(dynamicPushOptions), ...Object.keys(staticPushOptions)].map(option => ({ label: option }))
            quickPick.items = Object.keys(dynamicPushOptions).map(option => ({ label: option }))
            if (editingIndex !== undefined) setActiveItem(editingIndex)
            updateMainTitle()
            editingIndex = undefined
        }

        const updatePushOption = (option: string, value: string) => {
            if (option in dynamicPushOptions) {
                if (!(value.startsWith('"') && value.endsWith('"'))) value = `"${value}"`
                dynamicPushOptions[option] = value
            }
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
            const activeItem = quickPick.activeItems[0]
            if (editingIndex === undefined) {
                if (!activeItem) return
                editingIndex = quickPick.items.indexOf(activeItem)
                const { label } = activeItem
                const editingOption = [...Object.entries(dynamicPushOptions), ...Object.entries(dynamicPushOptions)].find(
                    ([option, value]) => option === label,
                )!
                quickPick.items = []
                quickPick.title = `Changing option: ${label}`
                quickPick.value = editingOption[1]!
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
