const ROBOTS_TXT = `User-agent: facebookexternalhit
Disallow:
Allow: /

User-agent: Facebot
Disallow:
Allow: /

User-agent: FacebookBot
Disallow:
Allow: /

User-agent: facebookcatalog
Disallow:
Allow: /

User-agent: meta-externalagent
Disallow:
Allow: /

User-agent: meta-externalfetcher
Disallow:
Allow: /

User-agent: Twitterbot
Disallow:
Allow: /

User-agent: LinkedInBot
Disallow:
Allow: /

User-agent: OAI-SearchBot
Disallow:
Allow: /

User-agent: ChatGPT-User
Disallow:
Allow: /

User-agent: GPTBot
Disallow:
Allow: /

User-agent: Googlebot
Disallow:
Allow: /

User-agent: Google-Extended
Disallow:
Allow: /

User-agent: PerplexityBot
Disallow:
Allow: /

User-agent: *
Disallow:
Allow: /
`;

const robotsHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function onRequest({ request }) {
  if (request.method === "HEAD") {
    return new Response(null, { headers: robotsHeaders });
  }

  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...robotsHeaders,
        Allow: "GET, HEAD",
      },
    });
  }

  return new Response(ROBOTS_TXT, { headers: robotsHeaders });
}
