import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const PLUGIN = 'next-steps-plus'

// The fork answers three suggestions; the second names a command the session
// does not have, so two are offered.
const FORK_REPLY = JSON.stringify([
  { label: 'прогнать тесты', prompt: 'прогони тесты сервиса заказов и покажи падения' },
  { label: 'ревью', prompt: '/no-such-command сделай ревью' },
  { label: 'коммит', prompt: 'закоммить изменения одним коммитом' },
])

const BAND = {
  plugin: PLUGIN,
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

// What the engine answers beneath the plugin in a session.
function engine(on: On): void {
  mock.store(on)
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  on('command.run', async () => ({ text: '' }))
  on('ui.log', async () => ({ value: undefined }))
  on('ui.render', async (_$, e) => _$.ui.resolve(e).Box({}))
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const ANSWER = 'Готово: поправил обработчик и добавил тест. '.repeat(4)

test('desktop: a button sends the whole prompt it shows; ✎ edits it in a field', async ($, on) => {
  engine(on)
  let forks = 0
  on('model.fork', async () => {
    forks += 1
    return { value: { isAnswered: true, text: FORK_REPLY, usage: USAGE } }
  })
  on('command.list', async () => ({ value: [{ name: 'code-review', description: 'review', source: 'plugin' }] }))
  const submitted: { text: string; asUser: boolean }[] = []
  on('prompt.submit', async (_$, e) => {
    submitted.push({ text: e.text, asUser: e.origin?.kind === 'plugin' && e.origin.asUser === true })
    return { text: e.text }
  })

  // A subagent's turn costs no fork.
  await $.turn.complete({ turnId: 'a1', agentId: 'agent-1', answer: ANSWER, durationMs: 1, isAborted: false, reason: 'answer' })
  await $.turn.complete({ turnId: 't1', answer: ANSWER, durationMs: 1, isAborted: false, reason: 'answer' })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  let first = await ui.find({ key: 'send:0' })
  for (let i = 0; i < 200 && first === undefined; i++) first = await ui.find({ key: 'send:0' })
  expect(forks).toBe(1)
  // Each button's label is the whole prompt it sends; the unknown slash command was dropped.
  expect(first?.props.label).toBe('прогони тесты сервиса заказов и покажи падения')
  expect((await ui.find({ key: 'send:1' }))?.props.label).toBe('закоммить изменения одним коммитом')
  expect(await ui.find({ key: 'send:2' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'Можно спросить дальше' })).toBeDefined()

  // ✎ puts the prompt in a field; Enter sends the edit.
  await ui.press({ key: 'edit:1' })
  expect((await ui.find({ key: 'draft' }))?.props.value).toBe('закоммить изменения одним коммитом')
  await ui.input({ key: 'draft', text: 'закоммить изменения, без push' })
  expect(submitted).toEqual([{ text: 'закоммить изменения, без push', asUser: true }])
  expect(await ui.find({ key: 'send:0' })).toBeUndefined()
  await ui.unmount()

  // A second offer: a press sends exactly the text its button shows.
  await $.turn.complete({ turnId: 't1b', answer: ANSWER, durationMs: 1, isAborted: false, reason: 'answer' })
  // A wide band lays the two prompts out side by side.
  const again = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 200 }, surface: 'desktop' })
  let send = await again.find({ key: 'send:0' })
  for (let i = 0; i < 200 && send === undefined; i++) send = await again.find({ key: 'send:0' })
  expect(await again.find({ key: 'row:0' })).toBeDefined()
  await again.press({ key: 'send:0' })
  expect(submitted[1]).toEqual({ text: 'прогони тесты сервиса заказов и покажи падения', asUser: true })
  await again.unmount()
})

test('terminal: a press fills the composer as the original does', async ($, on) => {
  engine(on)
  on('model.fork', async () => ({ value: { isAnswered: true, text: FORK_REPLY, usage: USAGE } }))
  on('command.list', async () => ({ value: [] }))
  const filled: string[] = []
  on('prompt.fill', async (_$, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })

  await $.turn.complete({ turnId: 't2', answer: ANSWER, durationMs: 1, isAborted: false, reason: 'answer' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  let first = await ui.find({ type: 'Button', text: /прогнать тесты/ })
  for (let i = 0; i < 200 && first === undefined; i++) first = await ui.find({ type: 'Button', text: /прогнать тесты/ })
  expect(first).toBeDefined()
  await ui.press({ key: first?.key ?? 'прогнать тесты' })
  expect(filled).toEqual(['прогони тесты сервиса заказов и покажи падения'])
  await ui.unmount()
})

test('/nextsteps off stops the fork', async ($, on) => {
  engine(on)
  let forks = 0
  on('model.fork', async () => {
    forks += 1
    return { value: { isAnswered: true, text: '[]', usage: USAGE } }
  })
  const off = await $.command.run({ command: 'nextsteps', args: 'off', origin: { kind: 'composer' }, presentation: 'text' } as never)
  expect(JSON.stringify(off)).toContain('выключены')
  await $.turn.complete({ turnId: 't3', answer: ANSWER, durationMs: 1, isAborted: false, reason: 'answer' })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  for (let i = 0; i < 50; i++) await ui.find({ key: 'draft' })
  expect(forks).toBe(0)
  expect(await ui.find({ key: 'draft' })).toBeUndefined()
  await ui.unmount()
})
