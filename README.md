
# Data Stewardship in Germany – Community Website

Website of the **Data Stewardship in Germany (DSG) Community**.

The website provides information about the community, its objectives, activities, events and resources. It is intended to serve as a central online presence for connecting people involved in Data Stewardship and Research Data Management in Germany.

**Live website:** [https://dsg-community-website.pages.dev](https://dsg-community-website.pages.dev)\
**GitHub repository:** [https://github.com/sdellachiesa/dsg-community-website](https://github.com/sdellachiesa/dsg-community-website)

---

## 1. Technical infrastructure

The website is built as a static website using a lightweight, Git-based development and deployment workflow.

The infrastructure deliberately relies on widely used tools and managed hosting services to keep maintenance requirements low and avoid the need to operate a dedicated web server.

### 1.1 Architecture

The current architecture consists of three main components:

| Component                       | Technology       | Purpose                                           |
| ------------------------------- | ---------------- | ------------------------------------------------- |
| Source code and version control | GitHub           | Stores the website source code and tracks changes |
| Static site generator           | Eleventy (11ty)  | Generates the website from templates and content  |
| Hosting and deployment          | Cloudflare Pages | Builds and publishes the website automatically    |

The overall workflow is:

```
Website source files
       |
       v
GitHub repository
       |
       | Commit / push to main
       v
Cloudflare Pages
       |
       | npm install
       | npm run build
       v
Eleventy generates static HTML
       |
       v
_site/
       |
       v
Published website
```

There is no dedicated application server or database involved in the current setup. The website is generated as static HTML, CSS and JavaScript files.

### 1.2 GitHub repository

The source code is maintained in the GitHub repository:

`sdellachiesa/dsg-community-website`

GitHub provides:

- Version control and change history.
- Central storage of all website source files.
- Browser-based editing of files.
- A basis for future collaborative development.

Changes can currently be made directly through the GitHub web interface, without installing Node.js or a local development environment.

The production branch is `main`.

### 1.3 Cloudflare Pages hosting

The website is hosted using Cloudflare Pages.

Current configuration:

| Setting                | Value                                |
| ---------------------- | ------------------------------------ |
| Hosting platform       | Cloudflare Pages                     |
| Git provider           | GitHub                               |
| Connected repository   | `sdellachiesa/dsg-community-website` |
| Production branch      | `main`                               |
| Build command          | `npm run build`                      |
| Build output directory | `_site`                              |
| Root directory         | `/`                                  |
| Node.js version        | 22.23.4                              |
| npm version            | 10.9.9                               |

Cloudflare automatically detects new commits to the production branch, retrieves the repository, installs the dependencies and runs the build process.

After a successful build, the generated website is published automatically.

The current public address is:

[https://dsg-community-website.pages.dev](https://dsg-community-website.pages.dev)

The website currently uses the Cloudflare-provided subdomain. A custom domain can be connected later without changing the underlying website architecture.

### 1.4 Hosting and deployment considerations

The current setup uses Cloudflare Pages Free.

One relevant consideration is the monthly build allowance. Development involving many separate commits can consume build allocations because changes pushed to the production branch trigger deployments.

For this reason, it is useful to:

- Group related changes into commits.
- Avoid committing every minor intermediate edit.
- Consider a separate preview/development workflow if development activity increases.

Cloudflare Pages also provides deployment previews for changes outside the production branch, which can be useful for future collaborative development.

---

## 2. Website generation: Eleventy

The website uses **Eleventy (11ty)**, a static site generator built on Node.js.

Eleventy takes source files, templates and data and generates the final HTML website.

It was chosen because it:

- Is lightweight and relatively simple to maintain.
- Supports Nunjucks templates.
- Allows content and layout to be separated.
- Generates standard static HTML.
- Does not require a database or complex backend.
- Can be extended when the website grows.

### 2.1 Dependencies

The project uses the following main dependencies:

| Dependency       | Version / specification                 | Purpose               |
| ---------------- | --------------------------------------- | --------------------- |
| `@11ty/eleventy` | `^3.1.2` (currently resolving to 3.1.8) | Static site generator |
| `nunjucks`       | `^3.2.4`                                | Template engine       |

Node.js and npm are used by Cloudflare during the build process.

### 2.2 Build commands

The `package.json` defines the following scripts:

```
{
  "scripts": {
    "build": "eleventy --config=eleventy.config.js && node -e \"console.log(require('fs').readFileSync('_site/index.html','utf8').slice(0,500))\"",
    "start": "eleventy --serve"
  }
}
```

- `npm run build`: generates the static website in `_site`.
- `npm start`: starts Eleventy's local development server (for use in a local development environment).

The build command currently includes an additional diagnostic output that prints the first 500 characters of the generated homepage. This can be simplified once development and troubleshooting are complete.

### 2.3 Eleventy configuration

The main configuration file is:

`eleventy.config.js`

It defines:

- `src` as the input directory.
- `_includes` as the directory for shared templates.
- `_site` as the generated output directory.
- Nunjucks as the template engine.
- The supported template formats (`njk`, `md`, `html`).
- A passthrough copy rule for static assets.
- The `base` layout alias.

The configuration also contains diagnostic logging added during initial development. This can be reviewed and cleaned up once the setup is considered stable.

---

## 3. Website structure

The source files are organised to separate page content, shared layouts, static assets and structured data.

Current structure:

```
dsg-community-website/
│
├── src/
│   │
│   ├── index.njk
│   ├── about.njk
│   ├── community.njk
│   ├── activities.njk
│   ├── news.njk
│   ├── resources.njk
│   │
│   ├── _includes/
│   │   └── layouts/
│   │       └── base.njk
│   │
│   ├── _data/
│   │   └── datastewards.json
│   │
│   └── assets/
│       ├── css/
│       │   └── style.css
│       │
│       ├── js/
│       │   └── map.js
│       │
│       └── images/
│           └── ...
│
├── eleventy.config.js
├── package.json
├── package-lock.json
└── README.md
```

### 3.1 Pages

The current website consists of six main pages:

| File             | Page          |
| ---------------- | ------------- |
| `index.njk`      | Home          |
| `about.njk`      | About         |
| `community.njk`  | Community     |
| `activities.njk` | Activities    |
| `news.njk`       | News & Events |
| `resources.njk`  | Resources     |

Each page contains its own content and uses the shared base layout.

### 3.2 Shared layout

The shared layout is:

`src/_includes/layouts/base.njk`

It defines the common website structure, including:

- HTML document structure and metadata.
- Page title and description.
- Stylesheet references.
- Website header and logo.
- Main navigation.
- Main content area.
- Website footer.

Individual pages provide their own content, which Eleventy inserts into the shared layout.

This avoids duplicating the header, navigation and footer across individual pages.

### 3.3 Page templates and front matter

Pages use Nunjucks templates (`.njk`) and YAML front matter.

A typical page starts with metadata similar to:

```
---
title: Community
description: Information about the Data Stewardship in Germany Community.
layout: base
---
```

The content follows the front matter.

An important implementation detail is that the front matter must start at the very beginning of the file, without a preceding blank line. This was relevant during the initial Eleventy configuration and troubleshooting.

---

## 4. Design and styling

The visual design is defined centrally in:

`src/assets/css/style.css`

The stylesheet contains the website's design variables and reusable styles.

### 4.1 Visual identity

The current design follows a restrained and professional visual language:

- Navy blue for the main visual identity and headings.
- White and light grey backgrounds.
- Warm gold/amber as an accent colour.
- Clean typography and generous whitespace.
- Simple navigation and clearly separated content sections.

The CSS uses central variables to make future design adjustments easier.

Current key colours include:

```
--navy: #18344f;
--navy-light: #294d6b;
--gold: #f0b429;
--gold-light: #f9e4ad;

--background: #ffffff;
--background-soft: #f4f6f8;

--text: #263442;
--text-muted: ...;
```

The stylesheet also contains the layout and styling for the interactive community map.

### 4.2 Images and static assets

Static assets are stored under:

`src/assets/`

Eleventy's passthrough copy configuration ensures that these files are copied to the generated website without being processed as templates.

For example:

- CSS files are published under `/assets/css/`.
- JavaScript files are published under `/assets/js/`.
- Images are published under `/assets/images/`.

---

## 5. Interactive community map

The Community page includes an interactive map showing the geographical distribution of Data Stewards and participating institutions across Germany.

The map is implemented using:

- **MapLibre GL JS** for rendering and interaction.
- **OpenFreeMap** for the underlying map tiles and style.
- **Positron** as the light, minimalist map style.

No API key is currently required for this map setup.

### 5.1 Map implementation

The map is defined in:

`src/assets/js/map.js`

MapLibre GL JS is loaded as an ES module from the unpkg CDN:

```
import * as maplibregl from
  'https://unpkg.com/maplibre-gl@6.18.0/dist/maplibre-gl.mjs';
```

The map is initialised only when the page contains the `community-map` element. This means the JavaScript file can be included without attempting to initialise a map on other pages.

The map configuration includes:

- Centre coordinates around Germany.
- Initial zoom level of 4.8.
- Minimum and maximum zoom levels.
- Navigation controls.
- Gold markers.
- Interactive popups containing the name, institution and city of each entry.

The map style is configured using:

```
style: 'https://tiles.openfreemap.org/styles/positron',
```

The MapLibre CSS stylesheet is included in the shared base layout.

### 5.2 Location data

The map's location data is stored separately from the JavaScript code in:

`src/_data/datastewards.json`

The JSON file contains records with the following structure:

```
[
  {
    "name": "Example Steward 01",
    "institution": "Example Institute North",
    "city": "Hamburg",
    "coordinates": [9.99, 53.55]
  }
]
```

The coordinates use the order:

```
[longitude, latitude]
```

Eleventy makes the JSON data available to the Community page through its global data mechanism.

The page embeds the data in a JSON script element, which `map.js` reads and parses before creating the markers.

This separation means that new locations can be added or existing ones updated by editing the JSON file, without changing the map implementation itself.

**Important:** The current entries are fictional examples used to test the map. They are not real community members or institutional affiliations and should be replaced with verified data before being presented as actual community information.

### 5.3 Map styling and configuration

The map's visual appearance and behaviour can be adjusted in `map.js`.

Examples:

- Change the map style by changing the OpenFreeMap style URL.
- Adjust the initial zoom using the `zoom` property.
- Change the map centre using the `center` property.
- Change marker colour using the `Marker` configuration.
- Adjust the map's dimensions in `style.css`, under `#community-map`.

The current design uses a light, minimalist map background and gold markers to fit the overall website identity.

---

## 6. Development and maintenance workflow

The current development workflow is deliberately simple and does not require a local development environment.

### 6.1 Editing files

Files can be edited directly in the GitHub repository using the browser interface.

Typical workflow:

1. Open the GitHub repository.
2. Navigate to the file to be changed.
3. Edit the content or code.
4. Commit the changes to `main`.
5. Cloudflare Pages automatically starts a new build.
6. Check the deployed website once the build has completed.

### 6.2 Where to make common changes

| Task                                 | File                             |
| ------------------------------------ | -------------------------------- |
| Change homepage content              | `src/index.njk`                  |
| Change About page                    | `src/about.njk`                  |
| Change Community page                | `src/community.njk`              |
| Change Activities page               | `src/activities.njk`             |
| Change News & Events page            | `src/news.njk`                   |
| Change Resources page                | `src/resources.njk`              |
| Change header, navigation or footer  | `src/_includes/layouts/base.njk` |
| Change colours, fonts and layout     | `src/assets/css/style.css`       |
| Change map behaviour and appearance  | `src/assets/js/map.js`           |
| Add or update map locations          | `src/_data/datastewards.json`    |
| Change build configuration           | `eleventy.config.js`             |
| Change dependencies or build scripts | `package.json`                   |

### 6.3 Troubleshooting

If a change does not appear on the live website:

1. Check whether the GitHub commit was successfully created.
2. Open the Cloudflare Pages dashboard and check the latest deployment.
3. Verify whether the build succeeded.
4. Refresh the website, preferably with a hard refresh.
5. For JavaScript-related problems, open the browser developer tools (F12) and inspect the Console for errors.

The browser developer console was particularly useful during the initial MapLibre implementation.

---

## 7. Current status

The following elements are currently implemented:

- GitHub repository established.
- Cloudflare Pages connected to GitHub.
- Automatic production deployment from `main`.
- Eleventy configured as static site generator.
- Nunjucks templates and shared base layout.
- Six main website pages.
- Central CSS stylesheet and design variables.
- Header, navigation, logo and footer.
- Interactive MapLibre map on the Community page.
- OpenFreeMap Positron map style.
- Separate JSON data source for map locations.
- Interactive location markers and popups.

---

## 8. Potential future developments

The current infrastructure provides a relatively simple foundation that can be extended without fundamentally changing the architecture.

Potential developments include:

### Custom domain

Connect a dedicated domain to Cloudflare Pages while keeping the GitHub repository and existing build process.

### Collaborative content editing

Introduce a simple content management interface so that colleagues can update news, events, resources and community information without directly editing Nunjucks templates.

### Improved content management

Move recurring content, such as events and news items, into structured data files or a suitable content management workflow.

### Community map data

Replace the fictional demonstration entries with verified community information and establish a process for maintaining and updating the data.

### Preview and review workflow

Introduce a separate development branch and use Cloudflare deployment previews to review changes before publishing them on the production website.

### Technical cleanup

Remove temporary diagnostic logging and simplify the build script once the initial development and troubleshooting phase is complete.

---

## 9. Design principles

The technical implementation follows a few general principles:

1. **Keep it simple:** Prefer lightweight technologies and avoid unnecessary infrastructure.
2. **Separate content from presentation:** Content, templates, styles and data should remain distinct.
3. **Keep maintenance accessible:** Routine updates should be possible through the GitHub browser interface.
4. **Use open technologies:** Prefer standard web technologies and open-source components.
5. **Allow gradual development:** New functionality should be introduced incrementally without requiring a complete redesign of the technical infrastructure.
6. **Keep ownership and portability:** The source code remains in the community's GitHub repository, independently of the hosting provider.



## **A few things I would add before considering the README final**

There are three technical details worth checking or documenting more precisely:

1. **Temporary debugging code:** `eleventy.config.js` still contains diagnostic logging and a `gray-matter` test. The build script also prints part of the generated homepage. These were useful during troubleshooting, but should eventually be removed.
2. **Map data safety:** The JSON data is currently embedded in the page using Nunjucks' `dump | safe` filters. Before accepting externally supplied names or other user-generated content, we should ensure that this serialization is safe against HTML/script injection.
3. **Collaborative editing:** The current website has no CMS yet. GitHub browser editing is the actual content-editing workflow; a more accessible interface is a future enhancement.

I would also recommend keeping the README focused on the architecture and maintenance instructions, rather than turning it into a record of every debugging episode. The history of implementation decisions can be documented separately if needed.

The draft above is a solid starting point.&#x20;
