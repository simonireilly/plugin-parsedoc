import { insertBatch } from '@lyrasearch/lyra'
import 'jsdom'
import { rehype } from 'rehype'
import rehypeDomParse from 'rehype-dom-parse'
import { DefaultSchemaElement, LyraInstance, PopulateOptions, rehypeLyra } from '../core/rehype-lyra.js'

export const populateFromDom = async (db: LyraInstance, data: string, options?: PopulateOptions): Promise<void> => {
  const records: DefaultSchemaElement[] = []
  await rehype().use(rehypeDomParse).use(rehypeLyra, records, options).process(data)
  return insertBatch(db, records)
}
