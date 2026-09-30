// Lets node tests import source modules that import each other without an extension, as the bundler expects.
import { register } from "node:module";

const hooks = `
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    const bare = specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".mjs") && !specifier.endsWith(".js");
    if (error && error.code === "ERR_MODULE_NOT_FOUND" && bare) return next(specifier + ".ts", context);
    throw error;
  }
}
`;

register("data:text/javascript," + encodeURIComponent(hooks));
