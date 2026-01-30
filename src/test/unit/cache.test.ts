import * as assert from 'node:assert'
import { beforeEach, suite, test } from 'mocha'
import type { Uri, WorkspaceFolder } from 'vscode'
import { type PathCacheKey, pathCache } from '../../cache'

/**
 * Unit tests for the path cache module.
 * These tests verify the caching mechanism works correctly with string-based keys.
 */
suite('Cache Unit Tests', () => {
	// Create mock workspace folders
	const mockWorkspaceFolder1: WorkspaceFolder = {
		uri: { toString: () => 'file:///workspace1' } as Uri,
		name: 'workspace1',
		index: 0,
	}

	const mockWorkspaceFolder2: WorkspaceFolder = {
		uri: { toString: () => 'file:///workspace2' } as Uri,
		name: 'workspace2',
		index: 1,
	}

	const mockUri1: Uri = {
		fsPath: '/workspace1/vendor/bin/php-cs-fixer',
		toString: () => 'file:///workspace1/vendor/bin/php-cs-fixer',
	} as Uri

	const mockUri2: Uri = {
		fsPath: '/workspace2/vendor/bin/php-cs-fixer',
		toString: () => 'file:///workspace2/vendor/bin/php-cs-fixer',
	} as Uri

	beforeEach(() => {
		// Clear cache before each test
		pathCache.clear()
	})

	test('should store and retrieve values', () => {
		const key: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		pathCache.set(key, mockUri1)

		assert.strictEqual(pathCache.has(key), true)
		assert.strictEqual(pathCache.get(key), mockUri1)
	})

	test('should return undefined for non-existent keys', () => {
		const key: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/non-existent',
		}

		assert.strictEqual(pathCache.has(key), false)
		assert.strictEqual(pathCache.get(key), undefined)
	})

	test('should differentiate between different patterns', () => {
		const key1: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		const key2: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/.php-cs-fixer.php',
		}

		pathCache.set(key1, mockUri1)
		pathCache.set(key2, mockUri2)

		assert.strictEqual(pathCache.get(key1), mockUri1)
		assert.strictEqual(pathCache.get(key2), mockUri2)
	})

	test('should differentiate between different workspace folders', () => {
		const key1: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		const key2: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder2,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		pathCache.set(key1, mockUri1)
		pathCache.set(key2, mockUri2)

		assert.strictEqual(pathCache.get(key1), mockUri1)
		assert.strictEqual(pathCache.get(key2), mockUri2)
	})

	test('should differentiate by excludePattern', () => {
		const key1: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/.php-cs-fixer*.php',
			excludePattern: '**/vendor/**',
		}

		const key2: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/.php-cs-fixer*.php',
			excludePattern: undefined,
		}

		pathCache.set(key1, mockUri1)
		pathCache.set(key2, mockUri2)

		assert.strictEqual(pathCache.get(key1), mockUri1)
		assert.strictEqual(pathCache.get(key2), mockUri2)
	})

	test('should work with equivalent keys created separately', () => {
		// This is the key bug fix test - previously objects as keys would not match
		const key1: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		pathCache.set(key1, mockUri1)

		// Create a new key object with same values
		const key2: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		// Should find the cached value even with a different object reference
		assert.strictEqual(pathCache.has(key2), true)
		assert.strictEqual(pathCache.get(key2), mockUri1)
	})

	test('should delete cached values', () => {
		const key: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		pathCache.set(key, mockUri1)
		assert.strictEqual(pathCache.has(key), true)

		pathCache.delete(key)
		assert.strictEqual(pathCache.has(key), false)
	})

	test('should clear all cached values', () => {
		const key1: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder1,
			pattern: '**/vendor/bin/php-cs-fixer',
		}

		const key2: PathCacheKey = {
			workspaceFolder: mockWorkspaceFolder2,
			pattern: '**/.php-cs-fixer.php',
		}

		pathCache.set(key1, mockUri1)
		pathCache.set(key2, mockUri2)

		pathCache.clear()

		assert.strictEqual(pathCache.has(key1), false)
		assert.strictEqual(pathCache.has(key2), false)
	})
})
