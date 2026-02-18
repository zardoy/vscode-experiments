//@eslint-disable
import * as vscode from 'vscode'
import { getExtensionSetting, type Settings } from 'vscode-framework'
import { gitApi } from '../git-api'

const GITHUB_API_BASE = 'https://api.github.com'
const GIT_POLL_INTERVAL_MS = 1000
const BUILD_POLL_INTERVAL_MS = 3000

type RunStatus = 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled' | 'skipped' | 'neutral' | null

interface CachedStatus {
    commitSha: string
    branch: string
    status: RunStatus
    conclusion: string | null
}

function parseGitHubOwnerRepo(remoteUrl: string | undefined): { owner: string; repo: string } | null {
    if (!remoteUrl) return null
    const trimmed = remoteUrl.replace(/\.git$/i, '').trim()
    // https://github.com/owner/repo or git@github.com:owner/repo
    const match = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)$/i)
    if (!match) return null
    return { owner: match[1]!, repo: match[2]! }
}

async function fetchLatestRunForCommit(
    owner: string,
    repo: string,
    headSha: string,
): Promise<{ status: RunStatus; conclusion: string | null } | null> {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?head_sha=${headSha}&per_page=1`
    const res = await fetch(url, {
        headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { workflow_runs?: Array<{ status: string; conclusion: string | null }> }
    const run = data.workflow_runs?.[0]
    if (!run) return null
    const status = run.status as string
    const conclusion = run.conclusion
    let runStatus: RunStatus = null
    if (status === 'completed') {
        runStatus =
            conclusion === 'success'
                ? 'success'
                : conclusion === 'failure'
                  ? 'failure'
                  : conclusion === 'cancelled'
                    ? 'cancelled'
                    : conclusion === 'skipped'
                      ? 'skipped'
                      : 'neutral'
    } else if (status === 'in_progress' || status === 'queued' || status === 'pending' || status === 'waiting') {
        runStatus = status === 'in_progress' ? 'in_progress' : 'queued'
    }
    return { status: runStatus, conclusion }
}

function statusToEmoji(status: RunStatus): string {
    switch (status) {
        case 'success':
            return '✅'
        case 'failure':
            return '❌'
        case 'in_progress':
        case 'queued':
            return '🔄'
        case 'cancelled':
        case 'skipped':
            return '⏹️'
        case 'neutral':
            return '➖'
        default:
            return '⏳'
    }
}

export const enableIf: keyof Settings = 'features.githubActionsStatusbar'

export default () => {

    const statusBarItem = vscode.window.createStatusBarItem(
        'githubActionsStatusbar',
        vscode.StatusBarAlignment.Right,
        900,
    )
    statusBarItem.name = 'GitHub Actions'
    statusBarItem.tooltip = 'Latest GitHub Actions build status for current commit'

    let cache: CachedStatus | null = null
    let gitPollTimer: ReturnType<typeof setInterval> | undefined
    let buildPollTimer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    const cancelTimers = () => {
        if (gitPollTimer) {
            clearInterval(gitPollTimer)
            gitPollTimer = undefined
        }
        if (buildPollTimer !== undefined) {
            clearTimeout(buildPollTimer)
            buildPollTimer = undefined
        }
    }

    const updateStatusBar = (status: RunStatus, branch: string) => {
        if (disposed) return
        const emoji = statusToEmoji(status)
        statusBarItem.text = `${emoji} ${branch}`
        statusBarItem.show()
    }

    const pollGitAndMaybeApi = async () => {
        if (disposed) return
        try {
            const api = gitApi.api
            if (api === undefined || api === null) {
                statusBarItem.hide()
                return
            }
            const root = vscode.workspace.workspaceFolders?.[0]?.uri
            const repo = root ? api.repositories.find(r => r.rootUri.toString() === root.toString()) : undefined
            if (!repo) {
                statusBarItem.hide()
                return
            }
            await repo.status()
            const head = repo.state.HEAD
            const commitSha = head?.commit
            const branch = head?.name ?? 'HEAD'
            const origin = repo.state.remotes.find(r => r.name === 'origin')
            const url = origin?.fetchUrl ?? origin?.pushUrl
            const parsed = parseGitHubOwnerRepo(url)
            if (!commitSha || !parsed) {
                if (!commitSha) statusBarItem.hide()
                else {
                    statusBarItem.text = `⏳ ${branch}`
                    statusBarItem.show()
                }
                return
            }
            if (cache && cache.commitSha === commitSha && cache.branch === branch) {
                updateStatusBar(cache.status, branch)
                if (cache.status === 'in_progress' || cache.status === 'queued') {
                    if (buildPollTimer === undefined) {
                        buildPollTimer = setTimeout(() => {
                            buildPollTimer = undefined
                            void fetchAndUpdate(parsed.owner, parsed.repo, commitSha, branch)
                        }, BUILD_POLL_INTERVAL_MS)
                    }
                }
                return
            }
            statusBarItem.command = {
                command: 'vscode.open',
                title: 'Open GitHub Actions',
                arguments: [vscode.Uri.parse(`https://github.com/${parsed.owner}/${parsed.repo}/actions`)],
            }
            void fetchAndUpdate(parsed.owner, parsed.repo, commitSha, branch)
        } catch {
            statusBarItem.hide()
        }
    }

    const fetchAndUpdate = async (
        owner: string,
        repo: string,
        commitSha: string,
        branch: string,
    ) => {
        if (disposed) return
        const result = await fetchLatestRunForCommit(owner, repo, commitSha)
        if (disposed) return
        const status = result?.status ?? null
        const conclusion = result?.conclusion ?? null
        cache = { commitSha, branch, status, conclusion }
        updateStatusBar(status, branch)
        if (status === 'in_progress' || status === 'queued') {
            if (buildPollTimer !== undefined) clearTimeout(buildPollTimer)
            buildPollTimer = setTimeout(() => {
                buildPollTimer = undefined
                void fetchAndUpdate(owner, repo, commitSha, branch)
            }, BUILD_POLL_INTERVAL_MS)
        }
    }

    gitPollTimer = setInterval(() => {
        void pollGitAndMaybeApi()
    }, GIT_POLL_INTERVAL_MS)
    void pollGitAndMaybeApi()

    return [
        {
            dispose() {
                disposed = true
                cancelTimers()
                statusBarItem.dispose()
            },
        },
    ]
}
