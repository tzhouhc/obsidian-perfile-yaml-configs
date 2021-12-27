## Obsidian Perfile YAML Configs

You know how you might have a whole bunch of configs applicable to each files,
but you don't necessarily want them to apply to every file you have?

* Maybe you want RTL on only some files.
* Maybe you want only a particular set of files to default to preview mode on
open.

This plugin *attempts* to do so.

## How To

In your YAML frontmatter, create key-value pairs under an YAML object
`perfile_configs:`:

```
---
perfile_configs:
  viewmode: preview
---
```

The keys and values are based on the options you are trying to set.
