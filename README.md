# next-steps-plus

A Claude Code mod that suggests up to three next prompts after each answer, in the terminal **and in the desktop app's Code tab**.

It is a fork of [next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps) by Thariq Shihipar, which draws only in the terminal.

## Install

Run this at the prompt of a terminal `claude` session:

```
/plugin install next-steps-plus --marketplace eldiablo-1226/next-steps-plus
```

Answer `y` to add the marketplace, then choose the user scope. You can also install from a shell:

```bash
claude plugin install next-steps-plus --marketplace eldiablo-1226/next-steps-plus
```

The desktop Code tab cannot run `/plugin install` itself. A mod installed at the user scope from a terminal loads in desktop sessions too.

## What you see

**Desktop.** A framed block above the other bands, headed «Можно спросить дальше». Each suggestion is one button numbered 1–3. A click, or its number while the band has focus, sends that exact text as your message. The dim ✎ next to a suggestion opens a field where you can edit it first, and Enter sends it. «скрыть» hides the block until the next answer.

**Terminal.** As in the original. Press 1, 2 or 3 in an empty prompt box, or click a suggestion, and it is written into the box as a draft for you to edit and send. The top suggestion also appears as dim Tab-to-take text.

The desktop app draws its own composer, so a mod cannot write into it: `$.prompt.fill` answers `no_composer` there, and a mod's `$.prompt.suggest` is not shown (anthropics/claude-code#99876). That is why desktop gets its own block.

## How it works

- When an answer of the main thread ends, the mod forks the session with `$.model.fork` and asks for likely next prompts. The fork shares the session's prompt cache, so each one costs about one short reply.
- Subagent turns are skipped, so a run with many subagents does not pay for a fork per agent.
- Answers shorter than `minAnswerChars` (default 80) are skipped.
- The session's skills and slash commands go into the fork's question, so a suggestion can be `/skill arguments`. A suggestion naming a command the session does not have is dropped.
- Suggestions come in the language you write in. The labels of the mod's own UI are in Russian.

## Safety

- Suggestions are model output, and the model reads untrusted text (files, tool results, web pages). Before any of it is shown, terminal escape sequences, invisible and control characters, and Unicode tag characters are stripped.
- On desktop, a button's label is the whole prompt it sends, so what you click is what goes out.
- Nothing is sent without your click or Enter.

## Commands and options

| | |
| --- | --- |
| `/nextsteps on` / `/nextsteps off` | turn suggestions on or off; remembered across sessions |
| `minAnswerChars` (default `80`) | skip suggestions after shorter answers |
| `suggestSkills` (default `true`) | let suggestions name the session's skills and slash commands |

Change the options with `/plugin configure next-steps-plus@next-steps-plus`.

## Develop

```bash
claude plugin validate .
CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test .
```

Tested on Claude Code 2.1.293 (the engine of the macOS desktop app).

## Credits

- [next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps) by Thariq Shihipar, MIT: the parsing, the text cleaning and the terminal band come from it unchanged; the fork prompt is extended with the length and language rules.
- The desktop layout follows [quick-replies](https://github.com/FynnXland/fynn-mods/tree/main/mods/quick-replies) by FynnXland.

MIT licensed, see [LICENSE](LICENSE).
