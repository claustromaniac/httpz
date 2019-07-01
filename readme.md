There are numerous similar extensions out there, but HTTPZ is different because it is not smart: it is Zmart. The following summarizes how it works with the default settings:
- When you are about to navigate to a site over HTTP, that request is aborted and a new one is started over HTTPS. If that new request results in an error, it is automatically redirected back to HTTP. If navigating to the site over HTTP throws an error too, HTTPZ does nothing more then. Otherwise, if it succeeds, the host is added to the ignore list, and all subsequent requests to it are ignored by the extension for seven days.
- When you navigate to a site over HTTPS by yourself, or because of some external factor (like Firefox filling the address with https:// based on your history and so on), HTTPZ ignores that request, regardless of the outcome.
- When you navigate to a site over HTTPS and *the servers* redirect you to HTTP, the extension notices this and automatically adds that hostname to the list of sites to ignore.

HTTPZ is meant to be unobtrusive and lightweight, it respects your privacy, and it is free of trans fats. Additionally, it is very configurable, and should be slightly more secure than some of the alternatives out there, since it has a couple of built-in ways to defend against SSL stripping attacks.

It also gets along with the [Temporary Containers][TC] extension, which I recommend.

Interested in more recommendations? Head over to the [ghacks-user.js][user.js] GitHub repository. It is an amazing project for hardening Firefox that I am proud to have contributed to, and a great source of information (including extension recommendations).

Limitations
------------
- When the initial request over HTTPS results in an error, Firefox starts loading an internal page that describes the error. HTTPZ does not wait for Firefox to finish loading those error pages, it immediately retries the request over HTTP, which causes them to load partially, and it does not look good. This is only a cosmetic issue, and a negligible one at that.
- Unlike HTTPS Everywhere, this extension does not take care of sub-requests triggered from HTTP-only sites. For now, it outright ignores those requests, because using the same approach with those (retrying on error) is very complicated and has significant drawbacks.

Acknowledgments
---------------
HTTPZ would not be what it is if not for [its testers' feedback on GitHub][issues].

[TC]: https://addons.mozilla.org/firefox/addon/temporary-containers/
[user.js]: https://github.com/ghacksuserjs/ghacks-user.js
[issues]: https://github.com/claustromaniac/httpz/issues
