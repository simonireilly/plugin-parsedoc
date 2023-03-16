import { Lyra, ResolveSchema } from '@lyrasearch/lyra'
import { Content, Element, Parent, Properties, Root } from 'hast'
import { fromHtml } from 'hast-util-from-html'
import { fromString } from 'hast-util-from-string'
import { toHtml } from 'hast-util-to-html'
import { toString } from 'hast-util-to-string'

type Writable<T> = {
  -readonly [K in keyof T]: T[K]
}

export type DefaultSchemaElement = ResolveSchema<Writable<typeof defaultHtmlSchema>>

export interface PopulateFromGlobOptions {
  transformFn?: TransformFn
  mergeStrategy?: MergeStrategy
}

export type PopulateOptions = PopulateFromGlobOptions & { basePath?: string }

export type FileType = 'html' | 'md'

export type LyraInstance = Lyra<typeof defaultHtmlSchema>

export type MergeStrategy = 'merge' | 'split' | 'both'

export const defaultHtmlSchema = {
  type: 'string',
  content: 'string',
  path: 'string'
} as const

export function rehypeLyra(records: DefaultSchemaElement[], options?: PopulateOptions): (tree: Root) => void {
  return (tree: Root) => {
    tree.children.forEach((child, i) => {
      visitChildren(child, tree, `${options?.basePath /* c8 ignore next */ ?? ''}root[${i}]`, records, options)
    })
  }
}

function visitChildren(
  node: Content,
  parent: Parent,
  path: string,
  records: DefaultSchemaElement[],
  options?: PopulateOptions
): void {
  if (node.type === 'text') {
    addRecords(
      node.value,
      (parent as Element).tagName,
      path,
      (parent as Element).properties,
      records,
      options?.mergeStrategy ?? 'merge'
    )
    return
  }

  if (!('tagName' in node)) return

  const transformedNode = typeof options?.transformFn === 'function' ? applyTransform(node, options.transformFn) : node

  transformedNode.children.forEach((child, i) => {
    visitChildren(child, transformedNode, `${path}.${transformedNode.tagName}[${i}]`, records, options)
  })
}

function applyTransform(node: Element, transformFn: TransformFn): Element {
  const preparedNode = prepareNode(node)
  const transformedNode = transformFn(preparedNode)
  return applyChanges(node, transformedNode)
}

function prepareNode(node: Element): NodeContent {
  const tag = node.tagName
  const content = toString(node)
  const raw = toHtml(node)
  const properties = node.properties
  return { tag, content, raw, properties }
}

function applyChanges(node: Element, transformedNode: NodeContent): Element {
  if (toHtml(node) !== transformedNode.raw) {
    return fromHtml(transformedNode.raw, { fragment: true }).children[0] as Element
  }
  node.tagName = transformedNode.tag
  if (toString(node) !== transformedNode.content) {
    return fromString(node, transformedNode.content)
  }
  return node
}

function addRecords(
  content: string,
  type: string,
  path: string,
  properties: Properties | undefined,
  records: DefaultSchemaElement[],
  mergeStrategy: MergeStrategy
): void {
  const parentPath = path.substring(0, path.lastIndexOf('.'))
  const newRecord = { type, content, path: parentPath, properties }

  // Shadow DOM elements are undefined
  if (type === undefined) return
  switch (mergeStrategy) {
    case 'merge':
      if (!isRecordMergeable(parentPath, type, records)) {
        records.push(newRecord)
        return
      }
      addContentToLastRecord(records, content, properties)
      return
    case 'split':
      records.push(newRecord)
      return
    case 'both':
      if (!isRecordMergeable(parentPath, type, records)) {
        records.push(newRecord, { ...newRecord })
        return
      }
      records.splice(records.length - 1, 0, newRecord)
      addContentToLastRecord(records, content, properties)
  }
}

function isRecordMergeable(path: string, tag: string, records: DefaultSchemaElement[]): boolean {
  if (!records.length) return false
  const lastRecord = records[records.length - 1]
  const parentPath = pathWithoutLastIndex(path)
  const lastPath = pathWithoutLastIndex(lastRecord.path)
  return parentPath === lastPath && tag === lastRecord.type
}

function pathWithoutLastIndex(path: string): string {
  const lastBracket = path.lastIndexOf('[')
  return path.slice(0, lastBracket)
}

function addContentToLastRecord(
  records: Array<DefaultSchemaElement & { properties?: Properties }>,
  content: string,
  properties?: Properties
): void {
  const lastRecord = records[records.length - 1]
  lastRecord.content += ` ${content}`
  lastRecord.properties = { ...properties, ...lastRecord.properties }
}

export interface NodeContent {
  tag: string
  raw: string
  content: string
  properties?: Properties
}

export type TransformFn = (node: NodeContent) => NodeContent
