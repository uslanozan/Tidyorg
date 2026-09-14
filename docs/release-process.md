# Release Process

Tidyorg uses explicit semantic-version tags. A tag builds the engine and dashboard images
once, publishes them to both GHCR and Docker Hub, and the GitHub Release is created after
both registries have been verified.

Current release: [`v0.1.2`](https://github.com/uslanozan/Tidyorg/releases/tag/v0.1.2)

The older generic, commit-derived release design is preserved in
[`release-template-process-2026-08.md`](release-template-process-2026-08.md).
It does not describe the current Tidyorg release workflow.

## 1. Choose the version

Tidyorg follows semantic versioning:

| Change | Increment | Example |
| :--- | :--- | :--- |
| Backward-incompatible configuration or behavior | Major | `1.4.2` → `2.0.0` |
| Backward-compatible feature | Minor | `1.4.2` → `1.5.0` |
| Backward-compatible fix | Patch | `1.4.2` → `1.4.3` |

Before 1.0, migration notes are required whenever users must update their configuration.

## 2. Prepare and verify

Update version references that are part of the release, including the dashboard's
`package.json` and `package-lock.json` when applicable. Then run the same checks as CI:

```bash
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform init -backend=false -input=false
terraform -chdir=terraform validate
terraform -chdir=terraform test

cd dashboard
npm ci
npm run build
npm run verify:yaml
```

Review the changes, merge them to `main`, and confirm that the `CI` workflow is green.
Tidyorg is trunk-based; it does not use `develop` or release branches.

## 3. Tag the exact commit

After confirming that local `main`, remote `main`, and the intended release commit match:

```bash
git tag v0.1.3
git push origin v0.1.3
```

A published version tag is immutable. Do not force-move or reuse it; correct a bad release
with a new patch version.

## 4. Let the image workflow finish

The root [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs on `v*`
tags and publishes the same build to both registries:

```text
ghcr.io/uslanozan/tidyorg:<version>
ghcr.io/uslanozan/tidyorg-dashboard:<version>
uslanozan/tidyorg:<version>
uslanozan/tidyorg-dashboard:<version>
```

For a tag such as `v0.1.3`, the workflow also updates `0.1` and `latest`. Both images are
built for `linux/amd64` and `linux/arm64`. A manual `workflow_dispatch` run publishes only
a temporary `sha-...` tag.

Wait for both matrix jobs and both registry exports to succeed. A successful engine job alone
is not a complete release.

## 5. Verify the published artifacts

Inspect the multi-architecture indexes and test the pulled images, not only local builds:

```bash
docker buildx imagetools inspect ghcr.io/uslanozan/tidyorg:0.1.3
docker buildx imagetools inspect ghcr.io/uslanozan/tidyorg-dashboard:0.1.3

docker pull ghcr.io/uslanozan/tidyorg:0.1.3
docker pull ghcr.io/uslanozan/tidyorg-dashboard:0.1.3

docker run --rm --entrypoint terraform ghcr.io/uslanozan/tidyorg:0.1.3 version
docker run --rm --entrypoint nginx ghcr.io/uslanozan/tidyorg-dashboard:0.1.3 -t
```

Confirm that the version, minor, and `latest` tags resolve to the expected index digest.

## 6. Publish the GitHub Release

Only after artifact verification, create a normal GitHub Release for the existing tag. Notes
should include highlights, configuration migrations, image names, supported platforms, and
the verification performed.

```bash
gh release create v0.1.3 \
  --verify-tag \
  --title "Tidyorg v0.1.3" \
  --notes-file release-notes.md
```

Do not mark a stable patch as a pre-release unless it is intentionally an alpha, beta, or
release candidate.

## Troubleshooting

**One image job is slow or stuck.** Do not publish the GitHub Release while either image is
missing. Check the job state and GHCR manifest. If a runner is clearly stuck, cancel the run
and rerun only the failed/cancelled job from the same tag.

**The tag exists but no GitHub Release exists.** This is expected until artifact verification
is complete; the image workflow and GitHub Release creation are deliberately separate.

**The image is private.** New GHCR packages can default to private. Change each package's
visibility to public once so unauthenticated users can pull it.

**A release contains a defect.** Keep its tag unchanged and publish a new patch release with
clear notes.
