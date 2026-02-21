import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolve project root directory.
 * bun build --compile changes import.meta.dirname to a virtual path,
 * so we fall back to CWD (set by LaunchAgent WorkingDirectory or manual cd).
 */
function resolveProjectRoot(): string {
  if (process.env.AI_WATCH_ROOT) return process.env.AI_WATCH_ROOT;

  // import.meta.dirname → src/utils/ → ../../ = project root
  const fromMeta = join(import.meta.dirname, "../..");
  if (existsSync(join(fromMeta, "config/sources.yaml"))) return fromMeta;

  // CWD fallback (compiled binary)
  const cwd = process.cwd();
  if (existsSync(join(cwd, "config/sources.yaml"))) return cwd;

  throw new Error(
    `Cannot resolve ai-watch project root. Tried:\n  - ${fromMeta}\n  - ${cwd}\nSet AI_WATCH_ROOT env or run from the ai-watch project directory.`
  );
}

let _root: string | null = null;

export function getProjectRoot(): string {
  if (!_root) _root = resolveProjectRoot();
  return _root;
}

export function projectPath(...segments: string[]): string {
  return join(getProjectRoot(), ...segments);
}
