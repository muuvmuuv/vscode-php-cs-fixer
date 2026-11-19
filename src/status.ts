import { LanguageStatusSeverity, languages, window, workspace } from 'vscode'
import { log } from './log'
import type { Tools } from './utils'

/** Command behind the status item: opens the extension's log. */
export const SHOW_LOG_COMMAND = 'php-cs-fixer.showLog'

/**
 * Language status item for PHP files: shows which PHP-CS-Fixer and config the formatter uses,
 * or why it cannot run.
 */
export const status = languages.createLanguageStatusItem('php-cs-fixer', { language: 'php' })
status.name = 'PHP-CS-Fixer'
status.text = 'PHP-CS-Fixer'
status.command = { title: 'Show Log', command: SHOW_LOG_COMMAND }

/** Reflect resolved tools (or the problem preventing a run) in the status item. */
export function showTools(tools: Tools): void {
	if (tools.problem) {
		showProblem(tools.problem)
		return
	}

	const executable = tools.executable ? workspace.asRelativePath(tools.executable) : ''
	const config = tools.config ? workspace.asRelativePath(tools.config) : 'default rules'
	status.severity = LanguageStatusSeverity.Information
	status.detail = `${executable} · ${config}`
}

/** Show a problem in the status item. */
export function showProblem(problem: string): void {
	status.severity = LanguageStatusSeverity.Error
	status.detail = problem
}

const notified = new Set<string>()

/**
 * Show an error notification once per session and message, so format on save does not repeat it
 * on every save; the status item keeps showing the current state.
 */
export function notifyOnce(message: string): void {
	log.error(message)
	if (notified.has(message)) {
		return
	}
	notified.add(message)
	void window.showErrorMessage(message, 'Show Log').then((choice) => {
		if (choice) {
			log.show()
		}
	})
}
