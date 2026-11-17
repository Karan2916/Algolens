import { Language, Parser } from "web-tree-sitter";
import type { CodeParser, ParsedCode } from "./types";
import type { CodeSnapshot } from "../shared/types";
import { normalizeAST } from "./ast";

let parserPromise: Promise<Parser> | null = null;

async function getParser(): Promise<Parser> {
  if (!parserPromise) {
    parserPromise = (async () => {
      await Parser.init({
        locateFile(scriptName: string) {
          return chrome.runtime.getURL(`wasm/${scriptName}`);
        },
      });

      const parser = new Parser();

      const wasmUrl = chrome.runtime.getURL(
        "wasm/tree-sitter-cpp.wasm"
      );

      const language = await Language.load(wasmUrl);

      parser.setLanguage(language);

      return parser;
    })();
  }

  return parserPromise;
}

export class CppParser implements CodeParser {
  supports(language: string): boolean {
    return language === "cpp";
  }

  async parse(snapshot: CodeSnapshot): Promise<ParsedCode> {
    const parser = await getParser();

    const tree = parser.parse(snapshot.code);
    if (!tree) {
        throw new Error("Tree-sitter returned no syntax tree");
    }

    const normalizedAST = normalizeAST(tree.rootNode);

    if (!tree) {
      throw new Error("Tree-sitter returned no syntax tree");
    }

    return {
      language: snapshot.language,
      tree: normalizedAST,
      snapshot,
    };
  }
}