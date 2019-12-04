[![][AMO_button]][AMO]

There are numerous similar extensions out there, but HTTPZ is different because it is not smart: it is Zmart. The following summarizes how it works with the default settings:
- When you are about to navigate to a site over HTTP, that request is aborted and a new one is started over HTTPS. If that new request results in an error, it is automatically redirected back to HTTP. If navigating to the site over HTTP throws an error too, HTTPZ does nothing more then. Otherwise, that host is added to the list of known insecure sites, and all subsequent requests to it are ignored by the extension for seven days.
- When you navigate to a site over HTTPS by yourself, or because of some external factor (like HSTS preloading), HTTPZ does not do anything to that request, regardless of the outcome.
- When you navigate to a site over HTTPS and *the server* downgrades the request to HTTP, the extension notices this and allows it. It adds that site to the list of known insecure sites, and does not try to load it over HTTPS for the next seven days.

HTTPZ is meant to be unobtrusive and lightweight, it respects your privacy, and is free of trans fats. Additionally, it is very configurable, and should be slightly more secure than some of the alternatives out there, since it has a couple of built-in defenses against SSL-stripping attacks.

It also gets along well with extensions that I recommend for managing contextual identities (containers), such as [Containerise][Cont] and [Temporary Containers][TC].

Interested in more recommendations? Head over to the [ghacks-user.js][user.js] GitHub repository. It is an amazing project for hardening Firefox that I have contributed to, and a great source of information (including extension recommendations).

Limitations
------------
- When the initial request over HTTPS results in an error, Firefox starts loading an internal page that describes the error. HTTPZ does not wait for Firefox to finish loading those error pages, it immediately retries the request over HTTP, which causes them to load partially, and it does not look good. This is only a cosmetic issue, and a negligible one at that.
- Unlike HTTPS Everywhere, this extension does not take care of sub-requests triggered from HTTP-only sites. For now, it outright ignores those requests, because using the same approach with those (retrying on error) is very complicated and has significant drawbacks.

Acknowledgments
---------------
HTTPZ would not be what it is if not for [its testers' feedback on GitHub][issues].

[AMO]: https://addons.mozilla.org/firefox/addon/httpz/
[AMO_button]: https://camo.githubusercontent.com/3d1db768c27fa8fee0adad148898eb32a9dc00d1/68747470733a2f2f676973742e6769746875622e636f6d2f636c61757374726f6d616e6961632f66303534303631383236616337316266396531323265646232613331336263302f7261772f414d4f2d627574746f6e5f312e706e67
[TC]: https://addons.mozilla.org/firefox/addon/temporary-containers/
[Cont]: https://addons.mozilla.org/firefox/addon/containerise/
[user.js]: https://github.com/ghacksuserjs/ghacks-user.js
[issues]: https://github.com/claustromaniac/httpz/issues
