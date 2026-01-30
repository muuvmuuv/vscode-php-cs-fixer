import type { Uri, WorkspaceFolder } from 'vscode'

export interface PathCacheKey {
	workspaceFolder: WorkspaceFolder
	pattern: string
	excludePattern?: string
}

function createCacheKey(key: PathCacheKey): string {
	return `${key.workspaceFolder.uri.toString()}::${key.pattern}::${key.excludePattern ?? ''}`
}

/** Stores file path in combination with its workspace. */
class PathCache {
	private cache = new Map<string, Uri>()

	has(key: PathCacheKey): boolean {
		return this.cache.has(createCacheKey(key))
	}

	get(key: PathCacheKey): Uri | undefined {
		return this.cache.get(createCacheKey(key))
	}

	set(key: PathCacheKey, value: Uri): void {
		this.cache.set(createCacheKey(key), value)
	}

	delete(key: PathCacheKey): boolean {
		return this.cache.delete(createCacheKey(key))
	}

	clear(): void {
		this.cache.clear()
	}
}

export const pathCache = new PathCache()
