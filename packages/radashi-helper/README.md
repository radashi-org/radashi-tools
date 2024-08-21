# radashi-helper

![npm](https://img.shields.io/npm/v/radashi-helper)
![code style: biome.js](https://img.shields.io/badge/code_style-biome.js-blue?logo=biome)

The command-line tool powering the [Radashi template](https://github.com/radashi-org/radashi-template). If you stumbled upon this package and don't know about the Radashi template yet, you probably want that instead.

## Installation

```
pnpm add -D radashi-helper
```

Alternatively, you can install this globally.

```
pnpm add -g radashi-helper
```

## Usage

After installing this from NPM, you can use the `radashi help` command to get started.

```
pnpm radashi help
```

Alternatively, there's a guide over at the [Radashi website](https://radashi.js.org/your-own-radashi).

Note: This tool expects a specific project structure (the one used by [radashi-org/radashi-template](https://github.com/radashi-org/radashi-template)).

### `radashi fn create [name]`

> Aliases: `fn add`

Scaffold the files for a new custom function.

### `radashi fn move [name] [dest]`

> Aliases: `fn rename`, `fn mv`

Rename the files for a custom function.

The `name` should include the group and function names, like `number/sum` or `object/pick`. If not provided, you will be prompted to pick the function you want.

The `dest` can be a group name, like `array`, or a full path, like `array/sum`. If not provided, you will be prompted to decide what to do.

**Important**: This command doesn't update any of the code. It will only rename the files.

```sh
# Interactive mode
pnpm radashi fn move

# Rename objectify without changing the group
pnpm radashi fn move array/objectify objectToArray

# Move sum to the array group without changing the name
pnpm radashi fn move number/sum array/sum
```

### `radashi fn override [query]`

Copy the files for an existing function into your project's `overrides` folder.

The `query` is a partial function name. If there's a tie for best match or no query is provided, you will be prompted to pick the function you want.

### `radashi pr import <pr-id>`

Copy the files for a Radashi “pull request” into your project.

The `pr-id` must be a valid PR ID in the `radashi-org/radashi` repository. See the [pull requests page](https://github.com/radashi-org/radashi/pulls) to find one.

Note: [GitHub CLI](https://cli.github.com) must be installed for this command.
