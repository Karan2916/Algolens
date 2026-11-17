import type { CodeSnapshot } from "../shared/types";
import type { ASTNode } from "./ast";

export interface ParsedCode {
  language: string;
  tree: ASTNode;
  snapshot: CodeSnapshot;
}

export interface CodeParser {
  supports(language: string): boolean;
  parse(snapshot: CodeSnapshot): Promise<ParsedCode>;
}