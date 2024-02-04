import * as vscode from 'vscode'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { extensionCtx, registerActiveDevelopmentCommand, registerExtensionCommand, showQuickPick } from 'vscode-framework'
import { omitObj } from '@zardoy/utils'
import { GitRepository, getGitActiveRepoOrThrow } from '../git-api'

interface Location {
    file: string
    line: number
    char?: number
    commitHash?: string
}

interface BreakpointLocations extends Location {
    breakpoint: Omit<vscode.Breakpoint, 'id'>
}

interface RepoLocations {
    [location: string]: {
        breakpointsPacks: {
            [name: string]: BreakpointLocations[]
        }
        bookmarks: {
            [name: string]: Location
        }
    }
}

const getPicks = (locations: { [name: string]: BreakpointLocations[] }) => {
    const breakpointPacks = Object.keys(locations)
    return breakpointPacks.map(breakpointPack => ({
        label: breakpointPack,
        value: breakpointPack,
        description: `${+locations[breakpointPack]!.length} breakpoints`,
    }))
}

export default () => {
    extensionCtx.globalState.setKeysForSync(['repoLocations'])
    const repoLocations = extensionCtx.globalState.get<RepoLocations>('repoLocations') ?? ({} as RepoLocations)
    const saveRepoLocations = () => extensionCtx.globalState.update('repoLocations', repoLocations)

    const getRepoLocationsKey = () => {
        let repo: GitRepository | undefined
        try {
            repo = getGitActiveRepoOrThrow()
        } catch (error) {
            console.warn(error)
            return
        }

        const originUrl = repo?.state.remotes.find(remote => remote.name === 'origin')?.fetchUrl
        return originUrl
    }

    const getRepoLocations = () => {
        const key = getRepoLocationsKey() ?? `local:${getCurrentWorkspaceRoot().name}`
        // eslint-disable-next-line no-return-assign
        return repoLocations[key] ?? (repoLocations[key] = { breakpointsPacks: {}, bookmarks: {} })
    }

    registerExtensionCommand('restoreBreakpointsPack', async () => {
        const locations = getRepoLocations().breakpointsPacks
        const selected = await showQuickPick(getPicks(locations))
        if (!selected) return
        const breakpoints = locations[selected]!
        const newBreakpoints = breakpoints.map(location => {
            const breakpoint = new vscode.SourceBreakpoint(
                new vscode.Location(vscode.Uri.joinPath(getCurrentWorkspaceRoot().uri, location.file), new vscode.Position(location.line, location.char ?? 0)),
            )
            Object.assign(breakpoint, location.breakpoint)
            return breakpoint
        })
        vscode.debug.addBreakpoints(newBreakpoints)
    })

    registerExtensionCommand('saveBreakpointsPack', async () => {
        const locations = getRepoLocations().breakpointsPacks
        const newValueSymbol = Symbol('new')
        const selected = await showQuickPick([...getPicks(locations), { label: 'New', value: newValueSymbol as any }])
        if (!selected) return
        const locationName = selected === newValueSymbol ? await vscode.window.showInputBox({ prompt: 'Enter a name for the breakpoint pack' }) : selected
        if (!locationName) return
        locations[locationName] = vscode.debug.breakpoints
            .map(breakpoint => {
                if (!(breakpoint instanceof vscode.SourceBreakpoint)) return undefined!
                const { uri, range } = breakpoint.location
                return {
                    file: vscode.workspace.asRelativePath(uri.path),
                    line: range.start.line,
                    char: range.start.character,
                    breakpoint: omitObj(breakpoint, 'id', 'location'),
                }
            })
            .filter(Boolean)

        await saveRepoLocations()
    })
}
