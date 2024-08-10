$revision = "$(git describe --tags --abbrev=0) $(git rev-parse --short HEAD)"
$timestamp = Get-Date -UFormat %s
"{`"revision`":`"$revision`",`"timestamp`":$timestamp}" | Out-File -FilePath ./public/build-meta.json
@"
export const REVISION = '$revision'
// eslint-disable-next-line @typescript-eslint/no-loss-of-precision, prettier/prettier
export const TIMESTAMP = $timestamp
"@ | Out-File -FilePath ./src/build-meta.ts
