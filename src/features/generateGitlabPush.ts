import * as vscode from 'vscode'
import { getExtensionContributionsPrefix, getExtensionSetting, registerExtensionCommand, getExtensionCommandId, RegularCommands } from 'vscode-framework'

export default () => {
    registerExtensionCommand('generateGitlabPush', async () => {
        // https://docs.gitlab.com/ee/user/project/push_options.html

        const quickPick = vscode.window.createQuickPick()
        const { dynamicPushOptions = {}, staticPushOptions = {} } = getExtensionSetting('generateGitlabPush')

        let isDisposeEnabled = false

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

        const updateQuickPick = () => {
            // Currently remove static options from quick pick as managing them looks tricky
            // quickPick.items = [...Object.keys(dynamicPushOptions), ...Object.keys(staticPushOptions)].map(option => ({ label: option }))
            quickPick.items = Object.keys(dynamicPushOptions).map(option => ({ label: option }))
            updateMainTitle()
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
                    void vscode.commands.executeCommand('setContext', getExtensionCommandId('generateGitlabPushOpened'), false)
                },
            },
        )

        quickPick.onDidAccept(async () => {
            const activeItem = quickPick.activeItems[0]!
            if (!activeItem) return
            isDisposeEnabled = false
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

            const updatingPartIndex = quickPick.items.indexOf(activeItem)
            const { label } = activeItem
            const editingOption = [...Object.entries(dynamicPushOptions), ...Object.entries(dynamicPushOptions)].find(([option, value]) => option === label)!
            const renamedPart = await vscode.window.showInputBox({ value: editingOption[1], title: `Updating ${label}` })

            if (renamedPart) updatePushOption(label, renamedPart)
            setActiveItem(updatingPartIndex)

            updateQuickPick()
            quickPick.show()
            isDisposeEnabled = true
        })

        await vscode.commands.executeCommand('setContext', getExtensionCommandId('generateGitlabPushOpened'), true)
        updateQuickPick()
        quickPick.show()
        quickPick.onDidHide(() => {
            if (isDisposeEnabled) mainDisposable.dispose()
        })
    })
}
