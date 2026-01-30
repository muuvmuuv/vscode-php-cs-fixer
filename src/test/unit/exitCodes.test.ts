import * as assert from 'node:assert'
import { suite, test } from 'mocha'

/**
 * PHP-CS-Fixer exit codes as documented:
 * https://github.com/PHP-CS-Fixer/PHP-CS-Fixer#exit-codes
 *
 * 0  - OK (no changes)
 * 4  - Some files have invalid syntax (skipped, not marked as changed)
 * 8  - Some files were fixed
 * 16 - Configuration error
 * 32 - Fixer error
 *
 * Exit codes can be combined with bitwise OR.
 */
const EXIT_CODE_OK = 0
const EXIT_CODE_INVALID_SYNTAX = 4
const EXIT_CODE_CHANGED = 8
const EXIT_CODE_CONFIG_ERROR = 16
const EXIT_CODE_FIXER_ERROR = 32

/**
 * Determines if an exit code indicates successful formatting.
 * This is the logic used in the formatter.
 */
function isSuccessExitCode(code: number): boolean {
	// Success if no error bits are set (only 0 or 8)
	return code === EXIT_CODE_OK || code === EXIT_CODE_CHANGED
}

/**
 * Unit tests for PHP-CS-Fixer exit code handling.
 * These tests verify we correctly interpret the various exit codes.
 */
suite('Exit Code Unit Tests', () => {
	suite('isSuccessExitCode', () => {
		test('should return true for exit code 0 (no changes needed)', () => {
			assert.strictEqual(isSuccessExitCode(EXIT_CODE_OK), true)
		})

		test('should return true for exit code 8 (files were fixed)', () => {
			assert.strictEqual(isSuccessExitCode(EXIT_CODE_CHANGED), true)
		})

		test('should return false for exit code 4 (invalid syntax)', () => {
			assert.strictEqual(isSuccessExitCode(EXIT_CODE_INVALID_SYNTAX), false)
		})

		test('should return false for exit code 16 (configuration error)', () => {
			assert.strictEqual(isSuccessExitCode(EXIT_CODE_CONFIG_ERROR), false)
		})

		test('should return false for exit code 32 (fixer error)', () => {
			assert.strictEqual(isSuccessExitCode(EXIT_CODE_FIXER_ERROR), false)
		})

		test('should return false for combined error codes (4 | 8 = 12)', () => {
			// Invalid syntax + changes = error overall
			const combined = EXIT_CODE_INVALID_SYNTAX | EXIT_CODE_CHANGED
			assert.strictEqual(combined, 12)
			assert.strictEqual(isSuccessExitCode(combined), false)
		})

		test('should return false for combined error codes (8 | 16 = 24)', () => {
			// Changes + config error = error overall
			const combined = EXIT_CODE_CHANGED | EXIT_CODE_CONFIG_ERROR
			assert.strictEqual(combined, 24)
			assert.strictEqual(isSuccessExitCode(combined), false)
		})

		test('should return false for combined error codes (16 | 32 = 48)', () => {
			// Config error + fixer error
			const combined = EXIT_CODE_CONFIG_ERROR | EXIT_CODE_FIXER_ERROR
			assert.strictEqual(combined, 48)
			assert.strictEqual(isSuccessExitCode(combined), false)
		})

		test('should return false for exit code 1 (generic error)', () => {
			assert.strictEqual(isSuccessExitCode(1), false)
		})

		test('should return false for negative exit codes', () => {
			assert.strictEqual(isSuccessExitCode(-1), false)
		})
	})

	suite('Exit code documentation', () => {
		test('EXIT_CODE_OK should be 0', () => {
			assert.strictEqual(EXIT_CODE_OK, 0)
		})

		test('EXIT_CODE_INVALID_SYNTAX should be 4', () => {
			assert.strictEqual(EXIT_CODE_INVALID_SYNTAX, 4)
		})

		test('EXIT_CODE_CHANGED should be 8', () => {
			assert.strictEqual(EXIT_CODE_CHANGED, 8)
		})

		test('EXIT_CODE_CONFIG_ERROR should be 16', () => {
			assert.strictEqual(EXIT_CODE_CONFIG_ERROR, 16)
		})

		test('EXIT_CODE_FIXER_ERROR should be 32', () => {
			assert.strictEqual(EXIT_CODE_FIXER_ERROR, 32)
		})
	})
})
