// Cloudflare Pages edge function — content negotiation for getcordoned.sh
// CLI clients (curl, wget, etc.) get the install script; browsers get the landing page.

const CLI_USER_AGENTS = [
  /^curl\//i,
  /^wget\//i,
  /^httpie\//i,
  /^powershell\//i,
  /^invoke-webrequest/i,
  /^python-requests\//i,
  /^node-fetch\//i,
  /^undici\//i,
];

const INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/agentcordon/agentcordon/main/tools/install.sh";

function isCLIRequest(request: Request): boolean {
  const ua = (request.headers.get("user-agent") || "").trim();
  const accept = (request.headers.get("accept") || "").trim();

  // Detect CLI user-agents
  for (const pattern of CLI_USER_AGENTS) {
    if (pattern.test(ua)) {
      return true;
    }
  }

  // Accept: text/plain WITHOUT text/html signals a CLI client
  if (accept.includes("text/plain") && !accept.includes("text/html")) {
    return true;
  }

  return false;
}

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // Only intercept the root path — everything else falls through
  if (url.pathname !== "/") {
    return context.next();
  }

  if (!isCLIRequest(context.request)) {
    // Browser request — serve the landing page
    return context.next();
  }

  // CLI request — fetch and return the install script
  const response = await fetch(INSTALL_SCRIPT_URL);

  if (!response.ok) {
    return new Response("Failed to fetch install script. Try again later.\n", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const script = await response.text();

  return new Response(script, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": "inline",
      "cache-control": "public, max-age=300, s-maxage=3600",
      "x-content-type-options": "nosniff",
    },
  });
};
