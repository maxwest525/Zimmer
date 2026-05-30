---
name: shadcn toast ReactNode title
description: Why toast titles in MASSA can't take JSX unless ToastProps "title" is omitted
---
In this shadcn toast setup, `ToasterToast = ToastProps & { title?: React.ReactNode }`.
ToastProps comes from the Radix Toast Root (a DOM element) which carries the global
HTML `title?: string` attribute, so the intersection collapses `title` to
`string & ReactNode` — effectively string-only, and passing a JSX element fails tsc.

**Rule:** to render an icon + text (ReactNode) in a toast title, define
`ToasterToast = Omit<ToastProps, "title"> & { title?: React.ReactNode; ... }` in
`hooks/use-toast.ts`. `description`/`action` don't collide (not HTML attrs), so they
already accept ReactNode.
**Why:** needed for MCP offline toasts to show the connector brand icon beside the name.
**How to apply:** any time a shadcn toast/title needs non-string content.
