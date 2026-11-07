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

The API is public and answers cross-origin requests from GitLab Pages. No token is shipped.

`assets/releases.json` is a snapshot, not the source of truth. Refresh it after a release:

```sh
curl -s "https://gitlab.com/api/v4/projects/editedcocktail1%2Fruntimely/releases?per_page=100" \
  -o assets/releases.json
```

## Publish it on GitLab Pages

The repository is named **`runtimely-site`**, so its Pages address is:

```
https://editedcocktail1.gitlab.io/runtimely-site/
```

### Create the project

1. Sign in to GitLab as `editedcocktail1`.
2. Use **+ → New project/repository → Create blank project**.
3. Set **Project name** to `Runtimely Site` and the **project slug** to `runtimely-site`.
4. Set **Visibility** to **Public**. Pages access control is simplest on a public project, and the app is
   public.
5. Leave **Initialize repository with a README** unchecked: this folder already has commits.
6. Press **Create project**.

Do not name the project `runtimely`: that path already belongs to the application repository. Do not use
`editedcocktail1.gitlab.io` unless you intend this to be the account's root user site.

### Push this folder

```sh
cd "C:/Users/EditedCocktail/Documents/Projects/ELECTRON PROJECTS/runtimely-site"
git remote add origin https://gitlab.com/editedcocktail1/runtimely-site.git
git push -u origin main
```

Use `git@gitlab.com:editedcocktail1/runtimely-site.git` instead of the HTTPS address if you push over SSH.

### Let Pages deploy

The committed `.gitlab-ci.yml` runs one `pages` job on the default branch. It copies `index.html`, `404.html`
and `assets/` into `public/`, which is what Pages publishes.

1. Open **Build → Pipelines** and wait for the `pages` job to pass.
2. Open **Deploy → Pages** (or **Settings → Pages**) and read the address.
3. If Pages is off, turn it on in **Settings → General → Visibility, project features, permissions → Pages**.

The first deployment takes a minute. Every push to `main` redeploys. A custom domain is added under
**Settings → Pages → New domain**.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page, its copy and its icons. |
| `404.html` | GitLab Pages' not-found page, in the same theme. |
| `assets/kit.css` | The part of Runtimely's ui-kit the page uses: the palette of both variants and the controls. |
| `assets/site.css` | The page layout, built only from the kit's tokens. |
| `assets/site.js` | Themes, languages, release fetching, and the small Markdown reader for release notes. |
| `assets/i18n.js` | English and Russian words. |
| `assets/releases.json` | The last saved release list, used when the API is unreachable. |
| `assets/icon.png` | Runtimely's icon. |
| `.gitlab-ci.yml` | The Pages job. |

## Themes and languages

Dark is the default, matching Runtimely's base theme. The choice is kept in `localStorage`, and the head
script applies it before the page paints. The light palette is the ui-kit's own base light values.

The language is English or Russian, defaulting to the browser's language, and is also kept in `localStorage`.
The interface switches; the release notes themselves are shown as published, in English.
