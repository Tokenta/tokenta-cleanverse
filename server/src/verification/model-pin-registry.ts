/** Mechanism spec §4.2B */

import registry from "../../data/model-pin-registry.json" with { type: "json" };

type Registry = {
  version: string;
  openai: Record<string, string>;
  anthropic: Record<string, string>;
  google: Record<string, string>;
};

const data = registry as Registry;

export function getModelPinRegistryVersion(): string {
  return data.version;
}

export function getModelPinRegistry(): Registry {
  return data;
}

export function getEquivalentModel(
  provider: "openai" | "anthropic" | "google" | "openai_compatible",
  modelId: string,
): string | null {
  const key =
    provider === "openai_compatible" ? "openai" : provider === "google" ? "google" : provider;
  const table = data[key as keyof Registry];
  if (!table || typeof table !== "object") return null;
  return (table as Record<string, string>)[modelId] ?? null;
}
