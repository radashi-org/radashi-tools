export interface CommonOptions {
  /**
   * The directory to run the command in.
   *
   * If not provided, search for the nearest `radashi.json` file or
   * `radashi` folder, starting from the current directory.
   */
  dir?: string
}
