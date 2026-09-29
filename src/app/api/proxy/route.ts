import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function normalizeTargetUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export async function GET(req: NextRequest) {
  return handleProxy(req, "GET");
}

export async function POST(req: NextRequest) {
  return handleProxy(req, "POST");
}

export async function PUT(req: NextRequest) {
  return handleProxy(req, "PUT");
}

export async function DELETE(req: NextRequest) {
  return handleProxy(req, "DELETE");
}

async function handleProxy(req: NextRequest, method: string) {
  const { searchParams } = new URL(req.url);
  const targetParam = searchParams.get("url");

  if (!targetParam) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#64748b;">
        <h2>hyunsurlinurl Proxy Engine</h2>
        <p>URL 파라미터가 지정되지 않았습니다. 상단 주소창에 이동할 사이트 주소를 입력해주세요.</p>
      </body></html>`,
      {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const targetUrl = normalizeTargetUrl(targetParam);

  try {
    const parsedTarget = new URL(targetUrl);
    const origin = parsedTarget.origin;

    // Upstream headers
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      Accept:
        req.headers.get("accept") ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": req.headers.get("accept-language") || "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: origin,
    };

    // Forward cookies if available
    const incomingCookies = req.headers.get("cookie");
    if (incomingCookies) {
      upstreamHeaders["Cookie"] = incomingCookies;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: upstreamHeaders,
      redirect: "follow",
    };

    // Forward body for POST/PUT if available
    if (method !== "GET" && method !== "HEAD") {
      const contentType = req.headers.get("content-type");
      if (contentType) {
        upstreamHeaders["Content-Type"] = contentType;
      }
      try {
        const bodyBuffer = await req.arrayBuffer();
        if (bodyBuffer.byteLength > 0) {
          fetchOptions.body = bodyBuffer;
        }
      } catch {
        // Body reading failed or empty
      }
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const finalUrl = upstreamRes.url || targetUrl;
    const finalParsed = new URL(finalUrl);
    const finalOrigin = finalParsed.origin;
    const contentType = upstreamRes.headers.get("content-type") || "";

    // Build client response headers
    const responseHeaders = new Headers();

    // Copy safe headers from upstream, stripping blocking or encoding-mismatch headers
    upstreamRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      // CRITICAL: Strip content-encoding & content-length because Node fetch automatically decompresses
      if (
        lower === "x-frame-options" ||
        lower === "content-security-policy" ||
        lower === "content-security-policy-report-only" ||
        lower === "strict-transport-security" ||
        lower === "content-encoding" ||
        lower === "content-length" ||
        lower === "transfer-encoding" ||
        lower === "connection" ||
        lower === "keep-alive"
      ) {
        return;
      }

      // Handle Set-Cookie to allow iframe storage
      if (lower === "set-cookie") {
        const rewrittenCookie = val
          .replace(/Domain=[^;]+/gi, "")
          .replace(/SameSite=[^;]+/gi, "SameSite=None; Secure");
        responseHeaders.append("set-cookie", rewrittenCookie);
        return;
      }

      responseHeaders.set(key, val);
    });

    // Explicitly allow embedding
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");

    // Send original URL in header
    responseHeaders.set("X-Hyuns-Final-Url", finalUrl);

    // If HTML: inject base tag, popup blocker & link rewriter
    if (contentType.includes("text/html")) {
      responseHeaders.set("Content-Type", "text/html; charset=utf-8");
      let html = await upstreamRes.text();

      const injectionScript = `
        <script>
          (function() {
            var currentTargetUrl = ${JSON.stringify(finalUrl)};
            var proxyBase = "/api/proxy?url=";
            var realParent = null;
            try {
              realParent = window.parent;
            } catch(e) {}

            // Frame buster defense: prevent top breakout
            try {
              Object.defineProperty(window, 'top', { get: function() { return window; } });
            } catch(e) {}

            // Notify outer container of URL change
            function notifyParentUrl(url) {
              try {
                if (realParent && realParent !== window) {
                  realParent.postMessage({
                    type: "HYUNS_URL_CHANGE",
                    url: url,
                    title: document.title || ""
                  }, "*");
                }
              } catch(e) {}
            }

            // Initial load notification
            notifyParentUrl(currentTargetUrl);

            // Hook history changes
            var origPushState = history.pushState;
            history.pushState = function() {
              var result = origPushState.apply(this, arguments);
              notifyParentUrl(window.location.href);
              return result;
            };
            var origReplaceState = history.replaceState;
            history.replaceState = function() {
              var result = origReplaceState.apply(this, arguments);
              notifyParentUrl(window.location.href);
              return result;
            };
            window.addEventListener('popstate', function() {
              notifyParentUrl(window.location.href);
            });
            window.addEventListener('hashchange', function() {
              notifyParentUrl(window.location.href);
            });

            // Prevent window.open from opening new window/tab -> navigate in place!
            window.open = function(url) {
              if (url) {
                var resolved = new URL(url, currentTargetUrl).href;
                window.location.href = proxyBase + encodeURIComponent(resolved);
              }
              return window;
            };

            // Intercept all link clicks so NO new window is opened
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href) {
                if (a.target === '_blank' || a.target === '_new') {
                  a.target = '_self';
                }
                var href = a.getAttribute('href') || a.href;
                if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                  e.preventDefault();
                  var resolved = new URL(href, currentTargetUrl).href;
                  window.location.href = proxyBase + encodeURIComponent(resolved);
                }
              }
            }, true);

            // Intercept form submissions
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form) {
                form.target = '_self';
                var action = form.getAttribute('action') || '';
                if (action) {
                  var resolved = new URL(action, currentTargetUrl).href;
                  form.action = proxyBase + encodeURIComponent(resolved);
                }
              }
            }, true);
          })();
        </script>
      `;

      const baseTag = `<base href="${finalOrigin}/">`;

      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${baseTag}${injectionScript}`);
      } else if (html.includes("<head ")) {
        html = html.replace(/<head[^>]*>/, `$&${baseTag}${injectionScript}`);
      } else {
        html = `${baseTag}${injectionScript}${html}`;
      }

      return new NextResponse(html, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: responseHeaders,
      });
    }

    // Binary or asset responses (CSS, JS, images, fonts)
    const arrayBuffer = await upstreamRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;padding:40px;color:#1e293b;background:#f8fafc;">
        <div style="max-width:560px;margin:40px auto;background:#fff;padding:32px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);border:1px solid #e2e8f0;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">🌐</div>
          <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;color:#0f172a;">사이트를 불러오는 중 오류가 발생했습니다</h2>
          <p style="font-size:14px;color:#64748b;margin-bottom:16px;">요청 주소: <code>${targetUrl}</code></p>
          <p style="font-size:13px;color:#ef4444;background:#fef2f2;padding:12px;border-radius:8px;text-align:left;word-break:break-all;">${errorMsg}</p>
          <div style="margin-top:24px;">
            <a href="/api/proxy?url=${encodeURIComponent(targetUrl)}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">다시 시도</a>
          </div>
        </div>
      </body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
