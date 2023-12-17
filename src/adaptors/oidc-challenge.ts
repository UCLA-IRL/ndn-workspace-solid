import type { Name } from "@ndn/packet";
import { toUtf8, fromUtf8 } from "@ndn/util";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type {
  ChallengeRequest, ParameterKV, ClientChallenge, ServerChallenge,
  ServerChallengeContext, ServerChallengeResponse
} from "@ndn/ndncert";

export class ClientOidcChallenge implements ClientChallenge {
  constructor(
    readonly challengeId: string,
    private readonly options: {
      oidcId: string;
      accessCode: string;
    }
  ) { }

  public async start(): Promise<ParameterKV> {
    return { "oidc-id": toUtf8(this.options.oidcId), "access-code": toUtf8(this.options.accessCode) };
  }

  public async next(): Promise<ParameterKV> {
    throw new Error("unexpected round");
  }
}

const invalidParameters: ServerChallengeResponse = {
  decrementRetry: true,
  challengeStatus: "invalid-paramters",
};
const invalidAccessCode: ServerChallengeResponse = {
  decrementRetry: true,
  challengeStatus: "invalid-access-code",
};

type State = {
  oidcId: Uint8Array;
  accessCode: Uint8Array;
}

export type AssignmentPolicy = (newSubjectName: Name, userId: string) => Promise<void>;

export abstract class ServerOidcChallenge implements ServerChallenge<State> {
  constructor(
    public readonly challengeId: string,
    public readonly timeLimit: number,
    public readonly retryLimit: number,
    private readonly options: {
      requestHeader: Record<string, string>;
      requestBody: URLSearchParams;
      requestUrl: string;
      pubKeyUrl: string;
      assignmentPolicy?: AssignmentPolicy;
    }
  ) { }

  public async process(
    request: ChallengeRequest, context: ServerChallengeContext<State>
  ): Promise<ServerChallengeResponse> {
    const {
      "oidc-id": oidcId,
      "access-code": accessCode,
    } = request.parameters;
    if (!oidcId || !accessCode) {
      return invalidParameters;
    }
    context.challengeState = { oidcId, accessCode };
    // write access code to the request body
    this.options.requestBody.append("code", fromUtf8(accessCode));
    try {
      const response = await fetch(this.options.requestUrl, {
        method: 'post',
        body: this.options.requestBody,
        headers: this.options.requestHeader
      });
      const data = await response.json();
      const JWKS = createRemoteJWKSet(new URL(this.options.pubKeyUrl));
      if (data["error"]) {
        return invalidAccessCode;
      }
      else if (data["id_token"]) {
        const { payload } = await jwtVerify(data["id_token"], JWKS);
        try {
          await this.options.assignmentPolicy?.(context.subjectName, String(payload["email"]));
        }
        catch { return invalidAccessCode; }
      }
    }
    catch (e) {
      console.error(`Failed in OIDC challenge: ${e}`)
      return invalidAccessCode;
    }
    return { success: true };
  }
}
