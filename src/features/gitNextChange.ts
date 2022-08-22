import { CommandHandler, registerExtensionCommand } from 'vscode-framework'

export default () => {
    const gitNextOrPreviousChange: CommandHandler = ({ command }) => {
        const isNextChange = command === 'gitNextChange'
    }

    registerExtensionCommand('gitNextChange', gitNextOrPreviousChange)
    registerExtensionCommand('gitPreviousChange', gitNextOrPreviousChange)
}
