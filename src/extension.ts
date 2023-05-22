import { execa } from 'execa'
import fs from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import {
  CancellationToken,
  ExtensionContext,
  FormattingOptions,
  languages,
  Position,
  Range,
  TextDocument,
  TextEdit,
  window,
  workspace,
} from 'vscode'

let executable: string | undefined
let config: string | undefined
let cancellationToken: CancellationToken | undefined

async function findPhpCsFixerExecutable(): Promise<string> {
  if (executable) {
    return executable
  }

  const userExecutable = workspace
    .getConfiguration('php-cs-fixer')
    .get<string>('executable')
  if (userExecutable) {
    return (executable = userExecutable)
  }

  try {
    const files = await workspace.findFiles(
      `**/vendor/bin/php-cs-fixer*`,
      undefined,
      1,
      cancellationToken,
    )

    if (files.length === 0) {
      throw new Error('No executable found.')
    }

    return (executable = files[0].fsPath)
  } catch (error) {
    if (error instanceof Error) {
      window.showErrorMessage('Failed searching for executable: ' + error.message)
    }
    throw error
  }
}

async function findPhpCsFixerConfig(): Promise<string> {
  if (config) {
    return config
  }

  const userConfig = workspace.getConfiguration('php-cs-fixer').get<string>('config')
  if (userConfig) {
    return (config = userConfig)
  }

  try {
    const files = await workspace.findFiles(
      `**/.php-cs-fixer.php`,
      undefined,
      1,
      cancellationToken,
    )

    if (files.length === 0) {
      throw new Error('No config found.')
    }

    return (config = files[0].fsPath)
  } catch (error) {
    if (error instanceof Error) {
      window.showErrorMessage('Failed searching for config: ' + error.message)
    }
    throw error
  }
}

export function activate(context: ExtensionContext): void {
  workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('php-cs-fixer.executable')) {
      executable = undefined
    }
    if (event.affectsConfiguration('php-cs-fixer.config')) {
      executable = undefined
    }
  })

  context.subscriptions.push(
    languages.registerDocumentFormattingEditProvider(
      {
        language: 'php',
      },
      {
        async provideDocumentFormattingEdits(
          document: TextDocument,
          _: FormattingOptions,
          token: CancellationToken,
        ): Promise<TextEdit[] | undefined> {
          if (
            document.languageId !== 'php' ||
            window.activeTextEditor === undefined ||
            window.activeTextEditor.document !== document ||
            cancellationToken !== undefined
          ) {
            return
          }

          cancellationToken = token

          const originalContents = document.getText()
          const temporaryFile = path.resolve(tmpdir(), 'pcf-' + Date.now() + '.php')
          await fs.writeFile(temporaryFile, originalContents, 'utf8')

          const phpCsFixerExecutable = await findPhpCsFixerExecutable()
          const phpCsFixerConfig = await findPhpCsFixerConfig()

          try {
            const process = execa(
              phpCsFixerExecutable,
              [
                'fix',
                '--using-cache=no',
                '-nq',
                `--config=${phpCsFixerConfig}`,
                temporaryFile,
              ],
              { encoding: 'utf8' },
            )

            token.onCancellationRequested(() => {
              process.kill()
            })

            const { stderr } = await process
            if (process.exitCode !== 0) {
              throw new Error(stderr)
            }

            const fixedContents = await fs.readFile(temporaryFile, 'utf8')
            if (fixedContents === originalContents) {
              return
            }

            const range = new Range(
              new Position(0, 0),
              document.lineAt(document.lineCount - 1).range.end,
            )
            const textEdit = TextEdit.replace(range, fixedContents)
            return [textEdit]
          } catch (error) {
            if (error instanceof Error) {
              window.showErrorMessage('Failed executing PHP CS Fixer: ' + error.message)
            }
            throw error
          } finally {
            await fs.rm(temporaryFile, { force: true })
            cancellationToken = undefined
          }
        },
      },
    ),
  )
}
