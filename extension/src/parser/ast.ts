export interface ASTNode {
  type: string;
  text?: string;

  startLine: number;
  startColumn: number;

  endLine: number;
  endColumn: number;

  children: ASTNode[];
}

interface TreeSitterNode {
  type: string;
  text: string;

  startPosition: {
    row: number;
    column: number;
  };

  endPosition: {
    row: number;
    column: number;
  };

  childCount: number;

  namedChildren: TreeSitterNode[];
}

export function normalizeAST(node: TreeSitterNode): ASTNode {
  return {
    type: node.type,

    text: node.childCount === 0
      ? node.text
      : undefined,

    startLine: node.startPosition.row,
    startColumn: node.startPosition.column,

    endLine: node.endPosition.row,
    endColumn: node.endPosition.column,

    children: node.namedChildren.map(normalizeAST),
  };
}