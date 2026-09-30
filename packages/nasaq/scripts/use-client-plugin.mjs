// A few Nasaq web modules call React hooks (useOptionalNasaq, useState, ...) but carry no "use client"
// directive: they only ever ran under a client parent inside the lab. Published, they would be imported
// straight from a Next Server Component and fail with "hooks in a server component". This plugin adds the
// directive to any packages/web module that calls a hook or creates a context and lacks one, so the
// source stays untouched. scripts/check-client.mjs then verifies the built output.
const HOOKS = /\buse[A-Z][A-Za-z0-9]*\s*\(|\bcreateContext\s*\(|\bforwardRef\s*\(/;
const DIRECTIVE = /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use client["']/;

export function useClientForHooks() {
  return {
    name: "nasaq:use-client-for-hooks",
    transform: {
      filter: { id: /[\/]packages[\/]web[\/]src[\/].*\.tsx?$/ },
      handler(code) {
        if (DIRECTIVE.test(code)) return null;
        if (!HOOKS.test(stripComments(code))) return null;
        return { code: `"use client";\n${code}`, map: null };
      },
    },
  };
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}
