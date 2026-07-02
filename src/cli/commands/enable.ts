import chalk from 'chalk'
import { RegistryStorage } from '../../core/storage.js'
import type { ItemKind } from '../../core/types.js'

export function enableCommand(storage: RegistryStorage, type: string, name: string, opts: any) {
  const kind = type as ItemKind
  const turnOn = !opts.off
  storage.setEnabled(kind, name, turnOn)
  console.log(chalk.green(`✔ ${kind} "${name}" 已${turnOn ? '启用' : '禁用'}`))
}
