import { getParser } from "./index";
import type { CodeSnapshot } from "../shared/types";

const snapshot: CodeSnapshot = {
  code: `
    int main() {
      int x = 10;

      if (x > 5) {
        x++;
      }

      return x;
    }
  `,
  language: "cpp",
  timestamp: Date.now(),
};

async function testParser() {
  const parser = getParser(snapshot.language);

  if (!parser) {
    console.error("❌ No parser found");
    return;
  }

  console.log("🔍 Parsing C++...");

  const result = await parser.parse(snapshot);

  console.log("✅ AST generated");
  console.log(result.tree);
}

testParser();