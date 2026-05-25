import type { ThemeRegistration } from "shiki";

export const idleToesPalette = {
  foreground: "#ffffff",
  background: "#323232",
  cursor: "#d6d6d6",
  black: "#323232",
  red: "#d25252",
  green: "#7fe173",
  yellow: "#ffc66d",
  blue: "#4099ff",
  magenta: "#f680ff",
  cyan: "#bed6ff",
  white: "#eeeeec",
  brightBlack: "#606060",
  brightRed: "#f07070",
  brightGreen: "#9dff91",
  brightYellow: "#ffe48b",
  brightBlue: "#5eb7f7",
  brightMagenta: "#ff9dff",
  brightCyan: "#dcf4ff",
  brightWhite: "#ffffff",
} as const;

export const idleToesTheme = {
  name: "idle-toes",
  displayName: "Idle Toes",
  type: "dark",
  fg: idleToesPalette.foreground,
  bg: idleToesPalette.background,
  colors: {
    "editor.background": idleToesPalette.background,
    "editor.foreground": idleToesPalette.foreground,
    "editorCursor.foreground": idleToesPalette.cursor,
    "editorLineNumber.foreground": idleToesPalette.brightBlack,
    "editorLineNumber.activeForeground": idleToesPalette.cursor,
    "editor.selectionBackground": "#606060",
    "terminal.ansiBlack": idleToesPalette.black,
    "terminal.ansiRed": idleToesPalette.red,
    "terminal.ansiGreen": idleToesPalette.green,
    "terminal.ansiYellow": idleToesPalette.yellow,
    "terminal.ansiBlue": idleToesPalette.blue,
    "terminal.ansiMagenta": idleToesPalette.magenta,
    "terminal.ansiCyan": idleToesPalette.cyan,
    "terminal.ansiWhite": idleToesPalette.white,
    "terminal.ansiBrightBlack": idleToesPalette.brightBlack,
    "terminal.ansiBrightRed": idleToesPalette.brightRed,
    "terminal.ansiBrightGreen": idleToesPalette.brightGreen,
    "terminal.ansiBrightYellow": idleToesPalette.brightYellow,
    "terminal.ansiBrightBlue": idleToesPalette.brightBlue,
    "terminal.ansiBrightMagenta": idleToesPalette.brightMagenta,
    "terminal.ansiBrightCyan": idleToesPalette.brightCyan,
    "terminal.ansiBrightWhite": idleToesPalette.brightWhite,
  },
  settings: [
    {
      settings: {
        background: idleToesPalette.background,
        foreground: idleToesPalette.foreground,
      },
    },
    {
      scope: ["comment", "punctuation.definition.comment", "string.comment"],
      settings: {
        foreground: idleToesPalette.brightBlack,
        fontStyle: "italic",
      },
    },
    {
      scope: ["keyword", "storage", "storage.type", "support.type.primitive"],
      settings: {
        foreground: idleToesPalette.blue,
        fontStyle: "bold",
      },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call",
        "variable.function",
      ],
      settings: {
        foreground: idleToesPalette.brightBlue,
      },
    },
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "support.class",
        "support.type",
      ],
      settings: {
        foreground: idleToesPalette.cyan,
      },
    },
    {
      scope: [
        "string",
        "string.quoted",
        "string.template",
        "constant.other.symbol",
      ],
      settings: {
        foreground: idleToesPalette.green,
      },
    },
    {
      scope: [
        "constant.numeric",
        "constant.language",
        "constant.character",
        "variable.other.constant",
      ],
      settings: {
        foreground: idleToesPalette.yellow,
      },
    },
    {
      scope: [
        "variable",
        "variable.parameter",
        "meta.object-literal.key",
        "support.variable.property",
      ],
      settings: {
        foreground: idleToesPalette.foreground,
      },
    },
    {
      scope: [
        "entity.name.tag",
        "support.type.property-name",
        "support.type.property-name.json",
        "meta.mapping.key",
        "meta.structure.dictionary.key",
        "meta.object-literal.key",
      ],
      settings: {
        foreground: idleToesPalette.cyan,
      },
    },
    {
      scope: [
        "keyword.operator",
        "storage.modifier",
        "punctuation.definition.template-expression",
      ],
      settings: {
        foreground: idleToesPalette.brightRed,
      },
    },
    {
      scope: [
        "punctuation",
        "punctuation.separator",
        "punctuation.terminator",
        "meta.brace",
      ],
      settings: {
        foreground: idleToesPalette.white,
      },
    },
    {
      scope: ["markup.heading", "entity.name.section", "keyword.control"],
      settings: {
        foreground: idleToesPalette.magenta,
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.link", "string.other.link"],
      settings: {
        foreground: idleToesPalette.brightCyan,
        fontStyle: "underline",
      },
    },
    {
      scope: ["markup.bold"],
      settings: {
        foreground: idleToesPalette.brightWhite,
        fontStyle: "bold",
      },
    },
    {
      scope: ["markup.italic"],
      settings: {
        foreground: idleToesPalette.cursor,
        fontStyle: "italic",
      },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: {
        foreground: idleToesPalette.brightWhite,
        background: idleToesPalette.red,
      },
    },
  ],
} satisfies ThemeRegistration;
