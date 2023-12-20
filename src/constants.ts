import { AltUri3 } from "@ndn/naming-convention2"

export const TestbedAnchorName = AltUri3.parseName(
  '/ndn/KEY/%27%C4%B2%2A%9F%7B%81%27/ndn/v=1651246789556' +
  '/sha256digest=64f43dcb8e787c967b6fbf7a82f200bc123d56f5dc078cd01eb7b92f77321723'
)

// This is the current work-around for some technical issue on the CA side.
// It is not secure and is supposed to change in future.
export const TestbedOidcAnchorPrefix = AltUri3.parseName(
  '/8=ndn/8=edu/8=ucla/8=workspace/8=KEY/8=%B3%F8%83%C9%9BR_%22/8=webapp/54=%00%00%01%8Bm%FFb%84' +
  '/1=%DFS%DB%A9%90k%DE%85%CC%82%F3%F7f%CC%1D%60%20%82%0A%AC%1F%3E%FD%11%E20V%C7%E2c%7B%EB'
)

export const WorkspaceAnchorName = AltUri3.parseName(
  '/ndn/multicast/workspace-test/KEY/-%BE%A9%A9%01d%B67/self/v=1699662749518' +
  '/sha256digest=0880e74e252781f58f715a2c906b2e0cf12f10b8cc8277527ee2b3fbf30f6bd1'
)

export const GoogleOAuthClientId = '960085847794-jgd05gg3b6l3ijm8khdiu8du8hb44h2i.apps.googleusercontent.com'
export const GoogleOIDCChallengeId = 'google-oidc'

export const GitHubOAuthClientId = 'Iv1.67da66ee76551396'
export const GitHubOIDCChallengeId = 'github-oidc'

export const DefaultTexliveEndpoint = 'https://texlive2.swiftlatex.com/'

export const LatexEnginePath = '/swiftlatex/swiftlatexpdftex.js'
