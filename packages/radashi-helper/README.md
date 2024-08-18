# radashi-helper

The command-line tool powering the [Radashi template](https://github.com/radashi-org/radashi-template). If you stumbled upon this package and don't know about the Radashi template yet, you probably want that instead.

## Usage

After installing this from NPM, you can use the `radashi help` command to get started.

```
pnpm radashi help
```

Alternatively, there's a guide over at the [Radashi website](https://radashi.js.org/your-own-radashi).

Note: This tool expects a specific project structure (the one used by Radashi template).

### `radashi fn add <name>`

Scaffold the files for a new custom function.

### `radashi fn move [fn-path]`

Rename the files for a custom function.

The `fn-path` should include the group and function names, like `number/sum` or `object/pick`. If not provided, you will be prompted to pick the function you want.

### `radashi override [query]`

Copy the files for an existing function into your project's `overrides` folder.

The `query` is a partial function name. If there's a tie for best match, you will be prompted to pick the function you want.

### `radashi pr import <pr-id>`

Copy the files for a Radashi PR into your project.

The `pr-id` must be a valid PR ID in the `radashi-org/radashi` repository.

Note: [GitHub CLI](https://cli.github.com) must be installed for this command.

### `radashi pr create`

Copy the files from your project into a Radashi clone and submit a pull request with its changes.

Note: [GitHub CLI](https://cli.github.com) must be installed for this command.
