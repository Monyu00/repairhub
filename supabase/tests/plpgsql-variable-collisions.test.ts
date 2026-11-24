// A plpgsql name that is both a variable and a column of a table used by the
// statement cannot be resolved: Postgres raises SQLSTATE 42702 at runtime. The
// new-ticket trigger hit that path because its loop variable shared a name with
// the ON CONFLICT target, which silently rolled back every Ticket intake. This
// keeps the final definition of every function free of that collision.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");

type FunctionDefinition = {
  migration: string;
  qualifiedName: string;
  body: string;
};

function readMigrations(): string[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();
}

function readFunctionDefinitions(migration: string, sql: string): FunctionDefinition[] {
  return [...sql.matchAll(/CREATE (?:OR REPLACE )?FUNCTION\s+([\w.]+)[\s\S]*?AS \$\$([\s\S]*?)\$\$/g)].map((match) => ({
    migration,
    qualifiedName: match[1],
    body: match[2],
  }));
}

function readVariableNames(body: string): string[] {
  const declaredSection = body.match(/DECLARE([\s\S]*?)BEGIN/)?.[1] ?? "";
  const declaredNames = [...declaredSection.matchAll(/^\s*(\w+)/gm)].map((match) => match[1]);
  const loopNames = [...body.matchAll(/FOR\s+(\w+)\s+IN/g)].map((match) => match[1]);
  return [...declaredNames, ...loopNames];
}

function readConflictTargets(body: string): string[] {
  return [...body.matchAll(/ON CONFLICT\s*\(([^)]*)\)/g)].flatMap((match) =>
    match[1]
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );
}

// A variable can also collide with an INSERT column list, which used to hide
// target_fingerprint behind v_target_fingerprint.
function readInsertColumns(body: string): string[] {
  return [...body.matchAll(/INSERT\s+INTO\s+[\w.]+\s*\(([\s\S]*?)\)/g)].flatMap((match) =>
    match[1]
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
  );
}

test("no plpgsql variable shadows an ON CONFLICT target column", () => {
  const latestDefinitions = new Map<string, FunctionDefinition>();
  for (const migration of readMigrations()) {
    for (const definition of readFunctionDefinitions(
      migration,
      readFileSync(join(migrationsDirectory, migration), "utf8"),
    )) {
      latestDefinitions.set(definition.qualifiedName, definition);
    }
  }

  const collisions = [...latestDefinitions.values()].flatMap((definition) =>
    readConflictTargets(definition.body)
      .filter((target) => readVariableNames(definition.body).includes(target))
      .map(
        (target) =>
          `${definition.migration}: ${definition.qualifiedName} variable and ON CONFLICT target share ${target}`,
      ),
  );

  assert.deepEqual(collisions, []);
});

test("no INSERT column uses the v_ variable prefix", () => {
  const latestDefinitions = new Map<string, FunctionDefinition>();
  for (const migration of readMigrations()) {
    for (const definition of readFunctionDefinitions(
      migration,
      readFileSync(join(migrationsDirectory, migration), "utf8"),
    )) {
      latestDefinitions.set(definition.qualifiedName, definition);
    }
  }

  const columns = [...latestDefinitions.values()].flatMap((definition) =>
    readInsertColumns(definition.body).map((column) => ({
      migration: definition.migration,
      qualifiedName: definition.qualifiedName,
      column,
    })),
  );

  assert.deepEqual(
    columns
      .filter((entry) => entry.column.startsWith("v_"))
      .map((entry) => `${entry.migration}: ${entry.qualifiedName} ${entry.column}`),
    [],
  );
});
