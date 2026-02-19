#!/usr/bin/env -S node --import tsx

import { readFileSync } from "node:fs";
import { compile, computeRenderKey, resolveBindings, validateTemplates } from "./index.ts";
import type { ValidationIssue } from "./types.ts";

interface CliFlags {
  design?: string;
  effects?: string;
  inputs?: string;
}

function printUsage(): void {
  console.log(`personalizer CLI

Usage:
  personalizer validate --design <path> --effects <path>
  personalizer resolve --design <path> --effects <path> --inputs <path>
`);
}

function parseFlags(argv: string[]): CliFlags {
  const flags: CliFlags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (!token || !token.startsWith("--") || !next || next.startsWith("--")) {
      continue;
    }

    const key = token.slice(2) as keyof CliFlags;
    flags[key] = next;
    i += 1;
  }

  return flags;
}

function readJson(path: string): unknown {
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed reading JSON at ${path}: ${(error as Error).message}`);
  }
}

function printErrors(label: string, errors: ValidationIssue[]): void {
  console.error(`${label} failed with ${errors.length} error(s):`);
  errors.forEach((error) => {
    console.error(`- ${error.path}: ${error.message}`);
  });
}

function parseInputPayload(raw: unknown): {
  inputs: Record<string, unknown>;
  uploads: Record<string, unknown>;
  assetContentHashes: Record<string, string>;
} {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("inputs payload must be a JSON object");
  }

  const payload = raw as Record<string, unknown>;

  const hasScopedKeys =
    Object.prototype.hasOwnProperty.call(payload, "inputs") ||
    Object.prototype.hasOwnProperty.call(payload, "uploads") ||
    Object.prototype.hasOwnProperty.call(payload, "assetContentHashes");

  if (!hasScopedKeys) {
    return {
      inputs: payload,
      uploads: {},
      assetContentHashes: {},
    };
  }

  return {
    inputs:
      typeof payload.inputs === "object" && payload.inputs !== null && !Array.isArray(payload.inputs)
        ? (payload.inputs as Record<string, unknown>)
        : {},
    uploads:
      typeof payload.uploads === "object" && payload.uploads !== null && !Array.isArray(payload.uploads)
        ? (payload.uploads as Record<string, unknown>)
        : {},
    assetContentHashes:
      typeof payload.assetContentHashes === "object" &&
      payload.assetContentHashes !== null &&
      !Array.isArray(payload.assetContentHashes)
        ? (payload.assetContentHashes as Record<string, string>)
        : {},
  };
}

async function main(): Promise<void> {
  const [command, ...restArgs] = process.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    printUsage();
    return;
  }

  const flags = parseFlags(restArgs);

  if (!flags.design || !flags.effects) {
    printUsage();
    throw new Error("Both --design and --effects are required");
  }

  const design = readJson(flags.design);
  const effects = readJson(flags.effects);

  const validation = validateTemplates(design, effects);
  if (!validation.ok) {
    printErrors("Validation", validation.errors);
    process.exitCode = 1;
    return;
  }

  if (command === "validate") {
    console.log("Templates are valid.");
    return;
  }

  if (command === "resolve") {
    if (!flags.inputs) {
      throw new Error("--inputs is required for resolve");
    }

    const payload = parseInputPayload(readJson(flags.inputs));

    const resolution = resolveBindings(validation.data.designTemplate, validation.data.effectsTemplate, {
      inputs: payload.inputs,
      uploads: payload.uploads,
    });

    if (!resolution.ok) {
      printErrors("Resolve", resolution.errors);
      process.exitCode = 1;
      return;
    }

    const plan = compile(
      validation.data.designTemplate,
      validation.data.effectsTemplate,
      resolution.data.resolvedInputs,
      {
        assetContentHashes: payload.assetContentHashes,
      },
    );

    const renderKey = computeRenderKey({
      templateId: plan.templateId,
      templateVersion: plan.templateVersion,
      sceneId: plan.sceneId,
      resolvedInputs: resolution.data.resolvedInputs,
      assetContentHashes: payload.assetContentHashes,
    });

    console.log(
      JSON.stringify(
        {
          renderKey,
          renderPlan: plan,
          renderModel: resolution.data,
        },
        null,
        2,
      ),
    );
    return;
  }

  printUsage();
  throw new Error(`Unknown command '${command}'`);
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
