import { getGithubConfig } from "../../config/env.ts";
import { AuthError } from "./auth.error.ts";
import { findOrCreateGithubUser, type AuthUserRow } from "./auth.repository.ts";
import crypto from "crypto";
import { updateUserSignin } from "./auth.repository.ts";

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
}

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

async function fetchGithub(
  url: string,
  options: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "TimeoutError";

    throw new AuthError(
      isTimeout ? 504 : 502,
      isTimeout ? "GITHUB_TIMEOUT" : "GITHUB_UNAVAILABLE",
      "GitHub에 연결하지 못했습니다.",
    );
  }
}

export async function fetchGithubUser(code: string): Promise<GithubUser> {
  const response = await fetchGithub("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${code}`,
      "User-Agent": "rn-portfolio",
    },
  });

  if (!response.ok) {
    throw new AuthError(
      response.status === 401 ? 401 : 502,
      "GITHUB_USER_REQUEST_FAILED",
      "GitHub 사용자 정보를 확인하지 못했습니다.",
    );
  }

  const user = (await response.json()) as GithubUser;

  if (
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.login !== "string"
  ) {
    throw new AuthError(
      502,
      "INVALID_GITHUB_RESPONSE",
      "GitHub 사용자 응답이 올바르지 않습니다.",
    );
  }

  return user;
}

export async function signinWithGithub(params: {
  code: string;
  codeVerifier: string;
}) {
  // 1. GitHub 인증 코드 → GitHub Access Token
  const githubAccessToken = await exchangeGithubCode(
    params.code,
    params.codeVerifier,
  );
  // 2. GitHub Access Token → GitHub 사용자 확인
  const githubUser = await fetchGithubUser(githubAccessToken);
  // 3. GitHub 계정에 연결된 서비스 회원 조회 또는 생성
  const user = await findOrCreateGithubUser({
    githubId: String(githubUser.id),
    name: githubUser.name || githubUser.login,
    imgUri: githubUser.avatar_url,
  });

  // 4. 자체 서비스 로그인 토큰 발급
  return issueUserSession(user);
}

async function issueUserSession(user: AuthUserRow) {
  const token = crypto.randomBytes(32).toString("hex");
  const loginDate = new Date();

  // 기존 서비스의 만료 정책을 유지하는 예시
  const expireDate = new Date(loginDate);
  expireDate.setDate(expireDate.getDate() + 100);

  await updateUserSignin(loginDate, token, expireDate, user.id);

  return {
    id: user.id,
    accountType: user.account_type,
    name: user.name,
    email: user.email,
    imgUri: user.image_uri,
    token,
    loginDate,
  };
}

export async function exchangeGithubCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  const config = getGithubConfig();

  const response = await fetchGithub(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    },
  );

  if (!response.ok) {
    throw new AuthError(
      502,
      "GITHUB_TOKEN_REQUEST_FAILED",
      "GitHub 토큰 요청에 실패했습니다.",
    );
  }

  const data = (await response.json()) as GithubTokenResponse;

  if (data.error || !data.access_token) {
    throw new AuthError(
      401,
      "GITHUB_CODE_REJECTED",
      "GitHub 인증 정보를 확인할 수 없습니다. 다시 로그인해주세요.",
    );
  }

  return data.access_token;
}
