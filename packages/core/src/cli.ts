#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  BindingResolutionError,
  resolveRenderModel,
  validateTemplates,
  type ValidationDiagnostic,
  TemplateValidationError,
  formatDiagnostics
} from "./index.js";

const usage = `Usage:
  personalizer validate --design <path> --effects <path>
  personalizer resolve --design <path> --effects <path> --inputs <path> [--assets <path>]`;

const parseOptions = (args: string[]): Record<string, string> => {
  const out: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    out[key] = value;
    index += 1;
  }

  return out;
};

const readJson = async (path: string): Promise<unknown> => {
  const content = await readFile(path, "utf8");
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON at '${path}': ${message}`);
  }
};

const printDiagnostics = (diagnostics: ValidationDiagnostic[]): void => {
  process.stderr.write(
    `Validation failed with ${diagnostics.length} issue(s):\n${formatDiagnostics(diagnostics)}\n`
  );
};

const main = async (): Promise<void> => {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "-h" || command === "--help") {
    process.stdout.write(`${usage}\n`);
    return;
  }

  const options = parseOptions(args);

  if (command === "validate") {
    if (!options.design || !options.effects) {
      throw new Error("validate requires --design and --effects");
    }

    const [designTemplate, effectsTemplate] = await Promise.all([
      readJson(options.design),
      readJson(options.effects)
    ]);

    const result = validateTemplates(designTemplate, effectsTemplate);
    if (!result.ok) {
      printDiagnostics(result.diagnostics);
      process.exitCode = 1;
      return;
    }

    process.stdout.write("Templates are valid.\n");
    return;
  }

  if (command === "resolve") {
    if (!options.design || !options.effects || !options.inputs) {
      throw new Error("resolve requires --design, --effects, and --inputs");
    }

    const [designTemplate, effectsTemplate, inputs, assets] = await Promise.all([
      readJson(options.design),
      readJson(options.effects),
      readJson(options.inputs),
      options.assets ? readJson(options.assets) : Promise.resolve({})
    ]);

    if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
      throw new Error("inputs must be a JSON object");
    }

    if (!assets || typeof assets !== "object" || Array.isArray(assets)) {
      throw new Error("assets must be a JSON object when provided");
    }

    const renderModel = resolveRenderModel({
      designTemplate,
      effectsTemplate,
      inputs: inputs as Record<string, unknown>,
      assets: assets as Record<string, unknown>
    });

    process.stdout.write(`${JSON.stringify(renderModel, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command '${command}'`);
};

main().catch((error) => {
  if (error instanceof TemplateValidationError || error instanceof BindingResolutionError) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n\n${usage}\n`);
  process.exitCode = 1;
});
