import type { Uri, WorkspaceFolder } from 'vscode'

export interface PathCacheKey {
	workspaceFolder: WorkspaceFolder
	pattern: string
	excludePattern?: string
}

/** Stores file path in combination with its workspace. */
export const pathCache = new Map<PathCacheKey, Uri>()
