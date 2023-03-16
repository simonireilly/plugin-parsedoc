import { insertBatch } from '@lyrasearch/lyra'
import { rehype } from 'rehype'
import rehypeDocument from 'rehype-document'
import rehypePresetMinify from 'rehype-preset-minify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { DefaultSchemaElement, FileType, LyraInstance, PopulateOptions, rehypeLyra } from '../core/rehype-lyra.js'

export const populate = async (
  db: LyraInstance,
  data: Buffer | string,
  fileType: FileType,
  options?: PopulateOptions
): Promise<void> => {
  const records: DefaultSchemaElement[] = []
  switch (fileType) {
    case 'md':
      // eslint-disable-next-line no-case-declarations
      const tree = unified().use(remarkParse).parse(data)
      await unified()
        .use(remarkRehype)
        .use(rehypeDocument)
        .use(rehypePresetMinify)
        .use(rehypeLyra, records, options)
        .run(tree)
      break
    case 'html':
      await rehype().use(rehypePresetMinify).use(rehypeLyra, records, options).process(data)
      break
    /* c8 ignore start */
    default:
      return fileType
    /* c8 ignore stop */
  }
  return insertBatch(db, records)
}
