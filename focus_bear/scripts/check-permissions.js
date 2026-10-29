// ST4S BE3: every permission, host permission and content-script match the extension requests must have a written
// justification in security/permission-justifications.json, and every justification must still be needed.
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { targets } from "./target.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JUSTIFICATIONS_PATH = resolve(root, "security/permission-justifications.json");
const MANIFESTS_DIR = resolve(root, "manifests");

const readJson = (path) => JSON.parse(readFileSync(path, "utf-8"));

const MATCH_PATTERN = /^(\*|https?):\/\/([^/]+)(\/.*)$/;
const ANY_SUBDOMAIN_PREFIX = "*.";
const ANY_PATH = "/*";

/** Whether host permission `pattern` already grants the content-script match `match` (Chrome match-pattern rules). */
export function isCoveredBy(match, pattern) {
  const [, matchScheme, matchHost, matchPath] = MATCH_PATTERN.exec(match) ?? [];
  const [, scheme, host, path] = MATCH_PATTERN.exec(pattern) ?? [];
  if (!matchScheme || !scheme) return false;
  const schemeCovered = scheme === "*" || scheme === matchScheme;
  const baseHost = host.startsWith(ANY_SUBDOMAIN_PREFIX)
    ? host.slice(ANY_SUBDOMAIN_PREFIX.length)
    : host;
  const hostCovered = host.startsWith(ANY_SUBDOMAIN_PREFIX)
    ? matchHost === baseHost || matchHost.endsWith(`.${baseHost}`)
    : matchHost === host;
  const pathCovered = path === ANY_PATH || path === matchPath;
  return schemeCovered && hostCovered && pathCovered;
}

/**
 * What one built manifest requests, grouped the same way as the justifications file. Content-script matches already
 * granted by a host permission are justified with that permission, so only broader matches need their own entry.
 */
export function requestedAccess(manifest) {
  const hostPermissions = manifest.host_permissions ?? [];
  const matches = (manifest.content_scripts ?? []).flatMap((script) => script.matches ?? []);
  return {
    permissions: manifest.permissions ?? [],
    host_permissions: hostPermissions,
    content_script_matches: matches.filter(
      (match) => !hostPermissions.some((pattern) => isCoveredBy(match, pattern)),
    ),
  };
}

/** Problems for a set of manifests: unjustified requests, and justifications nothing requests any more. */
export function findPermissionProblems(manifests, justifications) {
  const problems = [];
  for (const group of Object.keys(requestedAccess({}))) {
    const justified = justifications[group] ?? {};
    const requested = new Set(manifests.flatMap((manifest) => requestedAccess(manifest)[group]));
    for (const item of requested) {
      if (!justified[item]?.trim())
        problems.push(`${group}: "${item}" is requested but has no justification`);
    }
    for (const item of Object.keys(justified)) {
      if (!requested.has(item))
        problems.push(`${group}: "${item}" is justified but no manifest requests it`);
    }
  }
  return problems;
}

export function loadBuiltManifests() {
  const base = readJson(resolve(MANIFESTS_DIR, "base.json"));
  return targets.map((target) => ({
    ...base,
    ...readJson(resolve(MANIFESTS_DIR, target.overrideFile)),
  }));
}

export function loadJustifications() {
  return readJson(JUSTIFICATIONS_PATH);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = findPermissionProblems(loadBuiltManifests(), loadJustifications());
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("Every requested permission is justified.");
}
