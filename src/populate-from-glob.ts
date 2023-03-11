import { Lyra } from '@lyrasearch/lyra'
import glob from 'glob'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import type { defaultHtmlSchema, FileType, LyraInstance, PopulateFromGlobOptions } from './populate'
import { populate } from './populate.js'

const asyncGlob = promisify(glob)

export const populateFromGlob = async (
  db: Lyra<typeof defaultHtmlSchema>,
  pattern: string,
  options?: PopulateFromGlobOptions
): Promise<void> => {
  const files = await asyncGlob(pattern)
  await Promise.all(files.map(async filename => populateFromFile(db, filename, options)))
}

const populateFromFile = async (
  db: LyraInstance,
  filename: string,
  options?: PopulateFromGlobOptions
): Promise<void> => {
  const data = await readFile(filename)
  const fileType = filename.slice(filename.lastIndexOf('.') + 1) as FileType
  return populate(db, data, fileType, { ...options, basePath: `${filename}/` })
}
