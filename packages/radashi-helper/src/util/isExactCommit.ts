/**
 * Returns true if the branch is an exact commit hash or version tag.
 */
export function isExactCommit(branch: string) {
  return /^([0-9a-f]{7,40}|v[0-9]+\.[0-9]+\.[0-9]+(-\S+)?)$/.test(branch)
}
