Minimalist extension that painlessly redirects connections over the insecure HTTP protocol to HTTPS.

There are numerous similar extensions out there, but HTTPZ is different because it is not smart: it is Zmart. Here is how it works:

- When you are about to visit a site over HTTP, that request is aborted and a new one is started over HTTPS. If that request results in an error related to HTTPS (not just any kind of error), it is automatically redirected back to HTTP, and all subsequent requests to that host are ignored by the extension for the rest of the session (until Firefox is restarted).
- When you visit a site over HTTPS and *the servers* redirect you to HTTP, the extension notices that and automatically adds that hostname to the list of sites to ignore for the rest of the session.

HTTPZ is meant to be unobtrusive and lightweight, it respects your privacy, and it is free of trans fats.

It also gets along with the Temporary Containers extension, which I recommend.

TODO: improve the icon.
