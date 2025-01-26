# radashi-helper

![Gitter.im](https://badges.gitter.im/join_chat.svg)
![License](https://img.shields.io/npm/l/radashi-helper)
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

&nbsp;

### `radashi fn create [name]`

Scaffold the files for a new custom function.

<table>
<tr><td>Aliases</td><td><code>fn add</code></td></tr>
</table>

It creates the following files, skipping any that already exist:

- `src/<group>/<name>.ts`
- `tests/<group>/<name>.test.ts`
- `docs/<group>/<name>.mdx`
- `benchmarks/<group>/<name>.bench.ts`

The `name` can be a full path, like `array/sum`, or just the function name, like `sum`. If not provided, you will be prompted to name the function and/or select a group.

You'll also be prompted for a short description, which is added to the metadata at the top of the `docs/` file.

&nbsp;

### `radashi fn move [name] [dest]`

Rename the files for a custom function.

<table>
<tr><td>Aliases</td><td><code>fn rename</code>, <code>fn mv</code></td></tr>
</table>

The `name` should include the group and function names, like `number/sum` or `object/pick`. If not provided, you will be prompted to pick the function you want.

The `dest` can be a group name, like `array`, or a full path, like `array/sum`. If not provided, you will be prompted to decide what to do.

**Important**: This command doesn't update any of the code. It will only rename the files. This is being tracked in [#1](https://github.com/radashi-org/radashi-tools/issues/1).

```sh
# Interactive mode
pnpm radashi fn move

# Rename objectify without changing the group
pnpm radashi fn move array/objectify objectToArray

# Move sum to the array group without changing the name
pnpm radashi fn move number/sum array/sum
```

&nbsp;

### `radashi fn override [query]`

Copy the files for an existing function into your project's `overrides` folder.

The `query` is a partial function name. If there's a tie for best match or no query is provided, you will be prompted to pick the function you want.

```sh
# Interactive mode
pnpm radashi fn override

# Copy the files for "number/sum" into your project
pnpm radashi fn override number/sum
```

&nbsp;

### `radashi fn remove [name]`

Remove the files for a custom function.

```sh
# Interactive mode
pnpm radashi fn remove

# Remove the files for "number/sum"
pnpm radashi fn remove number/sum
```

&nbsp;

### `radashi pr import <pr-id>`

Copy the files for a Radashi “pull request” into your project.

```sh
# Import all changes from a PR
pnpm radashi pr import 208
```

#### Notes

- [GitHub CLI](https://cli.github.com) must be installed for this command.
- The `pr-id` must be a valid PR ID in the `radashi-org/radashi` repository. See the [pull requests page](https://github.com/radashi-org/radashi/pulls) to find one.
- The PR will be automatically committed to your Radashi.
- If the PR title doesn't follow the Conventional Commits format, you will be prompted to provide a commit message.
- There's no need to run `pnpm build` after importing a PR, as this command will do it for you.

&nbsp;

### `radashi build`

Compile and bundle the project, writing to the filesystem.

```sh
# Perform a production build.
pnpm radashi build

# Watch for changes and rebuild automatically.
pnpm radashi build --watch

# If you're using radashi-template:
pnpm build
```

&nbsp;

### `radashi lint [...globs]`

Check your Radashi files for possible bugs, formatting issues, and other problems.

Currently, this command supports Biome and ESLint.

```sh
# Lint all files.
pnpm radashi lint

# Lint only the files in the src folder.
pnpm radashi lint src/**/*.ts

# If you're using radashi-template:
pnpm lint
```

&nbsp;

### `radashi format [...globs]`

Format your Radashi files using Biome.

```sh
# Format all files.
pnpm radashi format

# Format only the files in the src folder.
pnpm radashi format src/**/*.ts

# If you're using radashi-template:
pnpm format
```

&nbsp;

### `radashi test [...globs]`

Run the tests for your custom Radashi functions.

This command expects [Vitest](https://vitest.dev) to be installed in your project. This means any flags supported by Vitest will work.

```sh
# Run all tests.
pnpm radashi test

# Run only the tests for your "foo" function.
pnpm radashi test foo

# Run only the tests for the files that match the globs.
pnpm radashi test src/array/*.ts

# If you're using radashi-template:
pnpm test
```

&nbsp;

### `radashi open [query]`

Open the files for a custom Radashi function in your preferred editor.

If you don't have a preferred editor, you will be prompted to pick one.

If you don't specify a query, you will be prompted to pick a function.

```sh
# Open the source file for the function named "foo".
pnpm radashi open foo

# Open all of the files related to the function named "foo".
pnpm radashi open foo -A
```

#### Flags

When no flags are provided, this command will open the source file by default.

- `-s, --source`: Open the source file.
- `-t, --test`: Open the test file.
- `-T, --type-test`: Open the type test file.
- `-b, --benchmark`: Open the benchmark file.
- `-d, --docs`: Open the documentation file.
- `-A, --all`: Open all related files.

&nbsp;
