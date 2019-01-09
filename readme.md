There are numerous similar Firefox extensions out there, but HTTPZ is different because it is not smart: it is Zmart. Here is how it works:

- When you are about to visit a site over HTTP, that request is aborted and a new one is started over HTTPS. If that request results in an error related to HTTPS (not just any kind of error), it is automatically redirected back to HTTP, and all subsequent requests to that host are ignored by the extension for the rest of the session (until Firefox is restarted).
- When you visit a site over HTTPS and *the servers* redirect you to HTTP, the extension notices that and automatically adds that hostname to the list of sites to ignore for the rest of the session.

HTTPZ is meant to be unobtrusive and lightweight, it respects your privacy, and it is free of trans fats.

It also gets along with the [Temporary Containers][TC] extension, which I recommend.

Known issues:
- When the initial request over HTTPS results in an error, Firefox starts loading an internal page that describes the error. HTTPZ doesn't wait for Firefox to finish loading those error pages, it immediately retries the request over HTTP, which causes them to load partially, and it doesn't look good. It is only a cosmetic issue, and so far I haven't found a reasonable way to fix it.
- Unlike HTTPS Everywhere, this extension doesn't take care of requests to third parties triggered from HTTP sites. For now, it outright ignores those requests, because using the same approach with those (retrying on error) is very complicated and has significant drawbacks.

[TC]: https://addons.mozilla.org/firefox/addon/temporary-containers/
