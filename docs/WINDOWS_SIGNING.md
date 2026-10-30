# Finish trusted Windows signing

**Status:** Candid 0.1.4 for Windows is unsigned. Smart App Control can block it. The signing pipeline is prepared, but a trusted replacement cannot be built until you complete Microsoft's publisher verification and configure the account below. No certificate has been issued or signed installer published by this change.

## 1. Verify your publisher identity

Follow [Microsoft's Artifact Signing quickstart](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) in the Azure portal:

1. Review the service's current pricing and eligibility before creating paid resources.
2. Create an **Artifact Signing account** in a supported region.
3. Complete **Public Trust identity validation** using your own details. Microsoft requires this step in its portal. For individuals, current eligibility is limited to the US and Canada; check the quickstart before proceeding.
4. After approval, create a **Public Trust** certificate profile. A **Private Trust** profile or self-signed certificate does not fix public Windows distribution.
5. Record the account's HTTPS regional endpoint, account name, profile name, and approved publisher display name. The publisher name must match the certificate, not necessarily your GitHub username. This identity appears publicly on signed executables.

Do the billing, legal terms and identity/ID steps yourself. Do not upload an ID, certificate private key, password or Azure client secret to this repository or chat. Candid does not need a downloadable private key.

## 2. Connect this repository with OIDC

Follow [Microsoft's GitHub OIDC instructions](https://github.com/Azure/artifact-signing-action/blob/main/docs/OIDC.md):

1. Create a Microsoft Entra application/service principal for Candid release signing.
2. Add a federated credential for GitHub Actions with:

   | Setting | Value |
   | --- | --- |
   | Issuer | `https://token.actions.githubusercontent.com` |
   | Subject | `repo:webwizarding/candid:environment:windows-signing` |
   | Audience | `api://AzureADTokenExchange` |

3. Give this principal **Artifact Signing Certificate Profile Signer** access to the intended certificate profile. Use the narrowest profile scope, rather than subscription Owner/Contributor.
4. In **GitHub → webwizarding/candid → Settings → Environments**, create `windows-signing`. Restrict deployments to trusted release tags and configure approval protection where available. Do not grant signing access to untrusted pull-request code.

This uses short-lived GitHub identity tokens and an Azure CLI session. No signing password or long-lived Azure client secret is stored in GitHub. The workflow is manual, with a pinned Azure login action.

## 3. Add the environment variables

Under the `windows-signing` environment, add these **Variables**. These are account identifiers/settings, not private keys:

| Variable | What to enter |
| --- | --- |
| `AZURE_CLIENT_ID` | Entra application/client ID |
| `AZURE_TENANT_ID` | Directory/tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Subscription holding the signing account |
| `AZURE_ARTIFACT_SIGNING_ENDPOINT` | Account's HTTPS regional endpoint, such as `https://eus.codesigning.azure.net` |
| `AZURE_ARTIFACT_SIGNING_ACCOUNT` | Artifact Signing account name |
| `AZURE_ARTIFACT_SIGNING_PROFILE` | Approved Public Trust certificate profile name |
| `CANDID_WINDOWS_PUBLISHER` | Exact approved publisher display name from the certificate |

The release job stops immediately if any setting is missing. Do not enter a dummy value just to make the check pass.

## 4. Build the signed replacement

Once verification is approved and the variables are saved, we can tag the next release containing these changes and run **Actions → Windows release** for that tag. The old `v0.1.4` source tag predates this signing setup; do not modify an already published tag or run its old unsigned workflow as a replacement.

The pipeline will:

- Configure Tauri's signing hook before building. It uses Microsoft's pinned `ArtifactSigning` PowerShell module, SHA-256, and an RFC 3161 timestamp.
- Sign the app, helper binaries, embedded NSIS uninstaller and setup executable during packaging. Temporary uninstaller files are recognized by executable content rather than filename extension.
- Require a valid Windows Authenticode signature, the expected publisher, the Artifact Signing Public Trust/code-signing EKUs and a timestamp.
- Verify the final app/setup hashes against signing receipts and require an embedded-executable receipt before uploading `Candid-Windows-Setup.exe`. There is no unsigned fallback.

The user-facing release still has two installer choices: Windows and macOS Apple Silicon. No additional signing files need to be downloaded by users.

## Verification and remaining work

**Windows signing checks** tests configuration, signature rejection, publisher/profile/timestamp policy, tampering and signing receipts without an Azure account. Its generated certificates and signature mocks are test fixtures, not publicly trusted signatures. It also checks compatibility with Microsoft's pinned module.

After real signing, test the downloaded installer, installed app and uninstaller on Windows with Smart App Control enabled. A valid signature addresses publisher trust; it does not guarantee that Microsoft's separate SmartScreen reputation checks will never show a warning, or override a malware classification. See [Microsoft's Smart App Control signing guidance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control) and [Tauri's signing guide](https://v2.tauri.app/distribute/sign/windows/).

Renaming, switching EXE/MSI/ZIP formats, or creating a self-signed certificate does not create public publisher trust. Candid does not turn off Windows security or add exclusions.
