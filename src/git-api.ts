/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import * as vscode from 'vscode'
import { Uri, Event, Disposable, ProviderResult, Command } from 'vscode'

interface Git {
    readonly path: string
}

interface InputBox {
    value: string
}

const enum ForcePushMode {
    Force,
    ForceWithLease,
}

const enum RefType {
    Head,
    RemoteHead,
    Tag,
}

interface Ref {
    readonly type: RefType
    readonly name?: string
    readonly commit?: string
    readonly remote?: string
}

interface UpstreamRef {
    readonly remote: string
    readonly name: string
}

interface Branch extends Ref {
    readonly upstream?: UpstreamRef
    readonly ahead?: number
    readonly behind?: number
}

interface Commit {
    readonly hash: string
    readonly message: string
    readonly parents: string[]
    readonly authorDate?: Date
    readonly authorName?: string
    readonly authorEmail?: string
    readonly commitDate?: Date
}

interface Submodule {
    readonly name: string
    readonly path: string
    readonly url: string
}

interface Remote {
    readonly name: string
    readonly fetchUrl?: string
    readonly pushUrl?: string
    readonly isReadOnly: boolean
}

const enum Status {
    INDEX_MODIFIED,
    INDEX_ADDED,
    INDEX_DELETED,
    INDEX_RENAMED,
    INDEX_COPIED,

    MODIFIED,
    DELETED,
    UNTRACKED,
    IGNORED,
    INTENT_TO_ADD,

    ADDED_BY_US,
    ADDED_BY_THEM,
    DELETED_BY_US,
    DELETED_BY_THEM,
    BOTH_ADDED,
    BOTH_DELETED,
    BOTH_MODIFIED,
}

interface Change {
    /**
     * Returns either `originalUri` or `renameUri`, depending
     * on whether this change is a rename change. When
     * in doubt always use `uri` over the other two alternatives.
     */
    readonly uri: Uri
    readonly originalUri: Uri
    readonly renameUri: Uri | undefined
    readonly status: Status
}

interface RepositoryState {
    readonly HEAD: Branch | undefined
    readonly refs: Ref[]
    readonly remotes: Remote[]
    readonly submodules: Submodule[]
    readonly rebaseCommit: Commit | undefined

    readonly mergeChanges: Change[]
    readonly indexChanges: Change[]
    readonly workingTreeChanges: Change[]

    readonly onDidChange: Event<void>
}

interface RepositoryUIState {
    readonly selected: boolean
    readonly onDidChange: Event<void>
}

/**
 * Log options.
 */
interface LogOptions {
    /** Max number of log entries to retrieve. If not specified, the default is 32. */
    readonly maxEntries?: number
    readonly path?: string
}

interface CommitOptions {
    all?: boolean | 'tracked'
    amend?: boolean
    signoff?: boolean
    signCommit?: boolean
    empty?: boolean
    noVerify?: boolean
    requireUserConfig?: boolean
    useEditor?: boolean
    verbose?: boolean
    postCommitCommand?: string
}

interface FetchOptions {
    remote?: string
    ref?: string
    all?: boolean
    prune?: boolean
    depth?: number
}

interface BranchQuery {
    readonly remote?: boolean
    readonly pattern?: string
    readonly count?: number
    readonly contains?: string
}

export interface GitRepository {
    readonly rootUri: Uri
    readonly inputBox: InputBox
    readonly state: RepositoryState
    readonly ui: RepositoryUIState

    getConfigs(): Promise<{ key: string; value: string }[]>
    getConfig(key: string): Promise<string>
    setConfig(key: string, value: string): Promise<string>
    getGlobalConfig(key: string): Promise<string>

    getObjectDetails(treeish: string, path: string): Promise<{ mode: string; object: string; size: number }>
    detectObjectType(object: string): Promise<{ mimetype: string; encoding?: string }>
    buffer(ref: string, path: string): Promise<Buffer>
    show(ref: string, path: string): Promise<string>
    getCommit(ref: string): Promise<Commit>

    add(paths: string[]): Promise<void>
    revert(paths: string[]): Promise<void>
    clean(paths: string[]): Promise<void>

    apply(patch: string, reverse?: boolean): Promise<void>
    diff(cached?: boolean): Promise<string>
    diffWithHEAD(): Promise<Change[]>
    diffWithHEAD(path: string): Promise<string>
    diffWith(ref: string): Promise<Change[]>
    diffWith(ref: string, path: string): Promise<string>
    diffIndexWithHEAD(): Promise<Change[]>
    diffIndexWithHEAD(path: string): Promise<string>
    diffIndexWith(ref: string): Promise<Change[]>
    diffIndexWith(ref: string, path: string): Promise<string>
    diffBlobs(object1: string, object2: string): Promise<string>
    diffBetween(ref1: string, ref2: string): Promise<Change[]>
    diffBetween(ref1: string, ref2: string, path: string): Promise<string>

    hashObject(data: string): Promise<string>

    createBranch(name: string, checkout: boolean, ref?: string): Promise<void>
    deleteBranch(name: string, force?: boolean): Promise<void>
    getBranch(name: string): Promise<Branch>
    getBranches(query: BranchQuery): Promise<Ref[]>
    setBranchUpstream(name: string, upstream: string): Promise<void>

    getMergeBase(ref1: string, ref2: string): Promise<string>

    tag(name: string, upstream: string): Promise<void>
    deleteTag(name: string): Promise<void>

    status(): Promise<void>
    checkout(treeish: string): Promise<void>

    addRemote(name: string, url: string): Promise<void>
    removeRemote(name: string): Promise<void>
    renameRemote(name: string, newName: string): Promise<void>

    fetch(options?: FetchOptions): Promise<void>
    fetch(remote?: string, ref?: string, depth?: number): Promise<void>
    pull(unshallow?: boolean): Promise<void>
    push(remoteName?: string, branchName?: string, setUpstream?: boolean, force?: ForcePushMode): Promise<void>

    blame(path: string): Promise<string>
    log(options?: LogOptions): Promise<Commit[]>

    commit(message: string, opts?: CommitOptions): Promise<void>
}

interface RemoteSource {
    readonly name: string
    readonly description?: string
    readonly url: string | string[]
}

interface RemoteSourceProvider {
    readonly name: string
    readonly icon?: string // codicon name
    readonly supportsQuery?: boolean
    getRemoteSources(query?: string): ProviderResult<RemoteSource[]>
    getBranches?(url: string): ProviderResult<string[]>
    publishRepository?(repository: GitRepository): Promise<void>
}

interface RemoteSourcePublisher {
    readonly name: string
    readonly icon?: string // codicon name
    publishRepository(repository: GitRepository): Promise<void>
}

interface Credentials {
    readonly username: string
    readonly password: string
}

interface CredentialsProvider {
    getCredentials(host: Uri): ProviderResult<Credentials>
}

interface PostCommitCommandsProvider {
    getCommands(repository: GitRepository): Command[]
}

interface PushErrorHandler {
    handlePushError(repository: GitRepository, remote: Remote, refspec: string, error: Error & { gitErrorCode: GitErrorCodes }): Promise<boolean>
}

type APIState = 'uninitialized' | 'initialized'

interface PublishEvent {
    repository: GitRepository
    branch?: string
}

interface API {
    readonly state: APIState
    readonly onDidChangeState: Event<APIState>
    readonly onDidPublish: Event<PublishEvent>
    readonly git: Git
    readonly repositories: GitRepository[]
    readonly onDidOpenRepository: Event<GitRepository>
    readonly onDidCloseRepository: Event<GitRepository>

    toGitUri(uri: Uri, ref: string): Uri
    getRepository(uri: Uri): GitRepository | null
    init(root: Uri): Promise<GitRepository | null>
    openRepository(root: Uri): Promise<GitRepository | null>

    registerRemoteSourcePublisher(publisher: RemoteSourcePublisher): Disposable
    registerRemoteSourceProvider(provider: RemoteSourceProvider): Disposable
    registerCredentialsProvider(provider: CredentialsProvider): Disposable
    registerPostCommitCommandsProvider(provider: PostCommitCommandsProvider): Disposable
    registerPushErrorHandler(handler: PushErrorHandler): Disposable
}

export interface GitExtension {
    readonly enabled: boolean
    readonly onDidChangeEnablement: Event<boolean>

    /**
     * Returns a specific API version.
     *
     * Throws error if git extension is disabled. You can listen to the
     * [GitExtension.onDidChangeEnablement](#GitExtension.onDidChangeEnablement) event
     * to know when the extension becomes enabled/disabled.
     *
     * @param version Version number.
     * @returns API instance
     */
    getAPI(version: 1): API
}

const enum GitErrorCodes {
    BadConfigFile = 'BadConfigFile',
    AuthenticationFailed = 'AuthenticationFailed',
    NoUserNameConfigured = 'NoUserNameConfigured',
    NoUserEmailConfigured = 'NoUserEmailConfigured',
    NoRemoteRepositorySpecified = 'NoRemoteRepositorySpecified',
    NotAGitRepository = 'NotAGitRepository',
    NotAtRepositoryRoot = 'NotAtRepositoryRoot',
    Conflict = 'Conflict',
    StashConflict = 'StashConflict',
    UnmergedChanges = 'UnmergedChanges',
    PushRejected = 'PushRejected',
    RemoteConnectionError = 'RemoteConnectionError',
    DirtyWorkTree = 'DirtyWorkTree',
    CantOpenResource = 'CantOpenResource',
    GitNotFound = 'GitNotFound',
    CantCreatePipe = 'CantCreatePipe',
    PermissionDenied = 'PermissionDenied',
    CantAccessRemote = 'CantAccessRemote',
    RepositoryNotFound = 'RepositoryNotFound',
    RepositoryIsLocked = 'RepositoryIsLocked',
    BranchNotFullyMerged = 'BranchNotFullyMerged',
    NoRemoteReference = 'NoRemoteReference',
    InvalidBranchName = 'InvalidBranchName',
    BranchAlreadyExists = 'BranchAlreadyExists',
    NoLocalChanges = 'NoLocalChanges',
    NoStashFound = 'NoStashFound',
    LocalChangesOverwritten = 'LocalChangesOverwritten',
    NoUpstreamBranch = 'NoUpstreamBranch',
    IsInSubmodule = 'IsInSubmodule',
    WrongCase = 'WrongCase',
    CantLockRef = 'CantLockRef',
    CantRebaseMultipleBranches = 'CantRebaseMultipleBranches',
    PatchDoesNotApply = 'PatchDoesNotApply',
    NoPathFound = 'NoPathFound',
    UnknownPath = 'UnknownPath',
    EmptyCommitMessage = 'EmptyCommitMessage',
}

export let gitApi: API | undefined | null

export const initGitApi = () => {
    const gitExtension = vscode.extensions.getExtension('vscode.git')
    if (!gitExtension) {
        gitApi = null
        return
    }
    gitExtension.activate().then(async (api: GitExtension) => {
        const git = api.getAPI(1)
        if (!git) return
        git.onDidChangeState(api => {
            if (api === 'initialized') {
                gitApi = git
            }
        })
    })
}

export const getGitApiOrThrow = () => {
    if (gitApi === null) throw new Error('Git extension is disabled')
    if (gitApi === undefined) throw new Error('Git extension is not ready yet')
    return gitApi
}

export const getGitActiveRepoOrThrow = () => {
    const gitApi = getGitApiOrThrow()
    const currentWorkspaceRoot = getCurrentWorkspaceRoot()
    return gitApi.repositories.find(({ rootUri }) => currentWorkspaceRoot.uri.toString() === rootUri.toString())
}
