# Runtimely site

The public page for Runtimely: the latest Windows download, the release history with the notes of every
version, a dark and a light theme, and English and Russian.

The page is plain HTML, CSS and JavaScript. There is no build step and no package manager: the repository is
the site.

## Run it locally

The release list is read with `fetch`, so opening `index.html` from the file system is not enough. Serve the
folder:

```sh
python -m http.server 8080
```

Then open <http://localhost:8080>. Any static server works.

## How the release history is read

1. The page asks the public GitLab API for the releases of `editedcocktail1/runtimely`.
2. If that request fails, it falls back to `assets/releases.json`, the last saved answer, and says so.
3. If both fail, it offers a retry and links to the GitLab releases page.

The API is public and answers cross-origin requests from GitHub Pages. No token is shipped.

`assets/releases.json` is a snapshot, not the source of truth. Refresh it after a release:

```sh
curl -s "https://gitlab.com/api/v4/projects/editedcocktail1%2Fruntimely/releases?per_page=100" \
  -o assets/releases.json
```

## Hosting

The repository is **`EditedCocktail/editedcocktail.github.io`**, the account's user site, so the address is:

```
https://editedcocktail.github.io/
```

GitHub Pages serves the repository root from the `main` branch. There is no Pages workflow: the committed
files are the deployed files. `.nojekyll` keeps GitHub from running Jekyll over them.

The Google Search Console verification file `google85b3b2db6e31c63e.html` is kept at the root. Do not remove or
rename it, or the site loses its verified status.

### Deploy

Push to `main`:

```sh
git push origin main
```

Check **Settings → Pages** once: the source must be **Deploy from a branch**, branch **main**, folder **/ (root)**.
A push then republishes the site within a minute.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page, its copy and its icons. |
| `404.html` | GitHub Pages' not-found page, in the same theme. |
| `assets/kit.css` | The part of Runtimely's ui-kit the page uses: the palette of both variants and the controls. |
| `assets/site.css` | The page layout, built only from the kit's tokens. |
| `assets/site.js` | Themes, languages, release fetching, and the small Markdown reader for release notes. |
| `assets/i18n.js` | English and Russian words. |
| `assets/releases.json` | The last saved release list, used when the API is unreachable. |
| `assets/icon.png` | Runtimely's icon. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |
| `google85b3b2db6e31c63e.html` | Google Search Console verification. |

## Themes and languages

Dark is the default, matching Runtimely's base theme. The choice is kept in `localStorage`, and the head
script applies it before the page paints. The light palette is the ui-kit's own base light values.

The language is English or Russian, defaulting to the browser's language, and is also kept in `localStorage`.
The interface switches; the release notes themselves are shown as published, in English.
