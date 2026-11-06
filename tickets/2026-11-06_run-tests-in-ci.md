Priority: 4
Topics: [ci, testing]

# Run the unit, type and e2e tests in CI on every pull request

## TLDR

The repository has no `.github/workflows`. Add a GitHub Actions workflow that installs with pnpm and runs `pnpm test:units`, `pnpm test:types` and `pnpm test:e2e` on each pull request and each push to `main`.

## Why it matters

Fixes land through pull requests (#41 to #64), but nothing runs the tests before merge, so a regression can reach `main` unseen. Before publishing to npm (see the publish ticket), a CI gate is the minimum.

## Notes

- The e2e tests need Chrome; see `/etc/devnet/chrome-gpu-flags` for how it runs on dev boxes, but CI uses its own runner setup.
- Pin the Node and pnpm versions to the `packageManager` field in `package.json`.
