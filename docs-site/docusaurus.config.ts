import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import type * as OpenApiPlugin from "docusaurus-plugin-openapi-docs";

const config: Config = {
  title: "Tiao",
  tagline: "The open-source multiplayer board game platform",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  url: "https://docs.tiao.ricos.site",
  baseUrl: "/",

  organizationName: "trebeljahr",
  projectName: "tiao",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/your-org/tiao/tree/main/docs-site/",
          docItemComponent: "@theme/ApiItem",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    "./plugins/webpack-polyfills",
    [
      "docusaurus-plugin-openapi-docs",
      {
        id: "api",
        docsPluginId: "default",
        config: {
          tiao: {
            specPath: "static/openapi.json",
            outputDir: "docs/api-reference",
            sidebarOptions: {
              groupPathsBy: "tag",
            },
          } satisfies OpenApiPlugin.Options,
        },
      },
    ],
  ],

  themes: ["docusaurus-theme-openapi-docs"],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Tiao",
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Docs",
        },
        {
          type: "docSidebar",
          sidebarId: "api",
          position: "left",
          label: "API Reference",
        },
        {
          href: "https://github.com/your-org/tiao",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Game Rules", to: "/docs/game-rules" },
            { label: "Architecture", to: "/docs/architecture" },
            { label: "API Reference", to: "/docs/api-reference/tiao-api" },
          ],
        },
        {
          title: "Developers",
          items: [
            { label: "Contributing", to: "/docs/contributing" },
            { label: "Testing", to: "/docs/testing" },
            { label: "Deployment", to: "/docs/deployment" },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/your-org/tiao",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Tiao Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
