import { create, search } from '@lyrasearch/lyra'
import { readFileSync } from 'fs'
import { JSDOM } from 'jsdom'
import t from 'tap'
import { defaultHtmlSchema as schema, populateFromDom } from '../../src/browser/index.js'

t.test('it should store the values', async t => {
  const db = await create({ schema })

  // Get Globals for DOM API without polyfill
  const dom = new JSDOM('<!DOCTYPE html><p>Hello world</p>')
  global.DOMParser = dom.window.DOMParser

  const filepath = readFileSync('test/fixtures/index.html')
  await populateFromDom(db, filepath.toString())
  t.strictSame(
    (await search(db, { term: 'Test' })).hits.map(({ document }) => document),
    [{ path: 'root[3]', content: 'Test', type: 'title', properties: {} }]
  )
})
