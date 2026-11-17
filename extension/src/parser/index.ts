import type { CodeParser } from "./types";
import { CppParser } from "./cpp";

const parsers: CodeParser[] = [
  new CppParser(),
];

export function getParser(language: string): CodeParser | null {
  return (
    parsers.find((parser) => parser.supports(language)) ?? null
  );
}