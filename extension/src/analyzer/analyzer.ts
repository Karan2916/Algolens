import type { ASTNode } from "../parser/ast";
import type {
  AlgorithmConstruct,
  AlgorithmModel,
  Operation,
} from "./types";
import { classifyDataType } from "./classifier";

/* =========================================================
   LOCATION
========================================================= */

function location(node: ASTNode) {
  return {
    startLine: node.startLine,
    startColumn: node.startColumn,
    endLine: node.endLine,
    endColumn: node.endColumn,
  };
}

/* =========================================================
   BASIC AST HELPERS
========================================================= */

function findChild(
  node: ASTNode,
  type: string
): ASTNode | undefined {
  return node.children.find(
    (child) => child.type === type
  );
}

/* =========================================================
   FUNCTION NAME EXTRACTION
========================================================= */

/**
 * Extract the actual function name from a C++ function
 * declarator.
 *
 * Tree-sitter C++ can represent function names using:
 *
 * field_identifier
 * identifier
 * qualified_identifier
 * nested structures
 *
 * We therefore try the most specific forms first.
 */
function getFunctionName(
  declarator: ASTNode
): string | undefined {

  // Most common case:
  //
  // function_declarator
  // ├── field_identifier -> levelOrder
  // └── parameter_list
  //
  const fieldIdentifier = declarator.children.find(
    (child) =>
      child.type === "field_identifier" &&
      !!child.text
  );

  if (fieldIdentifier?.text) {
    return fieldIdentifier.text;
  }

  // Normal identifier.
  const identifier = declarator.children.find(
    (child) =>
      child.type === "identifier" &&
      !!child.text
  );

  if (identifier?.text) {
    return identifier.text;
  }

  // Qualified identifiers can appear in more complex
  // C++ declarations.
  const qualifiedIdentifier =
    declarator.children.find(
      (child) =>
        child.type === "qualified_identifier"
    );

  if (qualifiedIdentifier) {
    const result =
      findIdentifierText(qualifiedIdentifier);

    if (result) {
      return result;
    }
  }

  // Last resort: recursively search the declarator,
  // but ignore generic/root-like nodes.
  return findIdentifierText(declarator);
}

/**
 * Recursively find a meaningful identifier.
 */
function findIdentifierText(
  node: ASTNode
): string | undefined {

  if (
    (node.type === "field_identifier" ||
      node.type === "identifier") &&
    node.text
  ) {
    return node.text;
  }

  for (const child of node.children) {
    const result = findIdentifierText(child);

    if (result) {
      return result;
    }
  }

  return undefined;
}

/* =========================================================
   DECLARATION ANALYSIS
========================================================= */

function getDeclarationInfo(node: ASTNode): {
  name?: string;
  dataType?: string;
} {
  const identifier = node.children.find(
    (child) =>
      child.type === "identifier" &&
      !!child.text
  );

  /*
   * Example:
   *
   * declaration
   * ├── template_type
   * │   ├── type_identifier -> vector
   * │   └── template_argument_list
   * └── identifier -> level
   */

  const templateType = node.children.find(
    (child) =>
      child.type === "template_type"
  );

  if (templateType) {
    const typeIdentifier =
      findDescendant(
        templateType,
        "type_identifier"
      );

    if (typeIdentifier?.text) {
      return {
        name: identifier?.text,
        dataType: typeIdentifier.text,
      };
    }
  }

  /*
   * Handle simpler declarations:
   *
   * int x;
   * string s;
   * Node* node;
   */

  const primitiveType =
    findDescendant(
      node,
      "primitive_type"
    );

  if (primitiveType?.text) {
    return {
      name: identifier?.text,
      dataType: primitiveType.text,
    };
  }

  const typeIdentifier =
    findDescendant(
      node,
      "type_identifier"
    );

  if (typeIdentifier?.text) {
    return {
      name: identifier?.text,
      dataType: typeIdentifier.text,
    };
  }

  return {
    name: identifier?.text,
    dataType: undefined,
  };
}

/* =========================================================
   GENERIC DESCENDANT SEARCH
========================================================= */

function findDescendant(
  node: ASTNode,
  type: string
): ASTNode | undefined {

  if (node.type === type) {
    return node;
  }

  for (const child of node.children) {
    const result = findDescendant(
      child,
      type
    );

    if (result) {
      return result;
    }
  }

  return undefined;
}

/* =========================================================
   OPERATION EXTRACTION
========================================================= */

function getOperation(
  node: ASTNode
): {
  object?: string;
  operation?: Operation;
} {

  /*
   * Common C++ case:
   *
   * call_expression
   * ├── field_expression
   * │   ├── identifier -> q
   * │   └── field_identifier -> push
   * └── argument_list
   */

  const fieldExpression =
    findDescendant(
      node,
      "field_expression"
    );

  if (!fieldExpression) {
    return {};
  }

  const objectNode =
    fieldExpression.children.find(
      (child) =>
        child.type === "identifier" &&
        !!child.text
    );

  const methodNode =
    fieldExpression.children.find(
      (child) =>
        child.type === "field_identifier" &&
        !!child.text
    );

  if (
    !objectNode?.text ||
    !methodNode?.text
  ) {
    return {};
  }

  return {
    object: objectNode.text,

    operation: {
      name: methodNode.text,
      location: location(node),
    },
  };
}

/* =========================================================
   ANALYZE AST NODE
========================================================= */

function analyzeNode(
  node: ASTNode
): AlgorithmConstruct[] {

  const constructs: AlgorithmConstruct[] = [];

  switch (node.type) {

    /* -----------------------------------------------------
       FUNCTION
    ----------------------------------------------------- */

    case "function_definition": {

      const declarator =
        findChild(
          node,
          "function_declarator"
        );

      let name: string | undefined;

      if (declarator) {
        name =
          getFunctionName(declarator);
      }

      constructs.push({
        type: "function",

        name,

        location: location(node),

        children: [],
      });

      break;
    }

    /* -----------------------------------------------------
       VARIABLE DECLARATION
    ----------------------------------------------------- */

    case "declaration": {

      const {
        name,
        dataType,
      } = getDeclarationInfo(node);

      /*
       * Don't generate useless variables.
       */

      if (name || dataType) {

        constructs.push({

          type: "variable",

          name,

          dataType,

          semanticType:
            classifyDataType(dataType),

          location:
            location(node),

          children: [],
        });
      }

      break;
    }

    /* -----------------------------------------------------
       FUNCTION / METHOD CALL
    ----------------------------------------------------- */

    case "call_expression": {

      const {
        object,
        operation,
      } = getOperation(node);

      if (
        object &&
        operation
      ) {

        constructs.push({

          type: "operation",

          /*
           * Example:
           *
           * q.push(x)
           *
           * name = q
           */

          name: object,

          operations: [
            operation,
          ],

          location:
            location(node),

          children: [],
        });
      }

      break;
    }

    /* -----------------------------------------------------
       LOOPS
    ----------------------------------------------------- */

    case "for_statement":

    case "while_statement":

    case "do_statement":

      constructs.push({

        type: "loop",

        location:
          location(node),

        children: [],
      });

      break;

    /* -----------------------------------------------------
       CONDITIONS
    ----------------------------------------------------- */

    case "if_statement":

    case "switch_statement":

      constructs.push({

        type: "condition",

        location:
          location(node),

        children: [],
      });

      break;
  }

  /* =======================================================
     RECURSIVELY ANALYZE CHILDREN
  ======================================================= */

  for (const child of node.children) {

    constructs.push(
      ...analyzeNode(child)
    );
  }

  return constructs;
}

/* =========================================================
   PUBLIC ANALYZER
========================================================= */

function linkOperations(
  constructs: AlgorithmConstruct[]
): AlgorithmConstruct[] {
  const variables = new Map<
    string,
    AlgorithmConstruct
  >();

  // First collect variables
  for (const construct of constructs) {
    if (
      construct.type === "variable" &&
      construct.name
    ) {
      variables.set(
        construct.name,
        construct
      );
    }
  }

  // Then attach operations to variables
  for (const construct of constructs) {
    if (
      construct.type !== "operation" ||
      !construct.name ||
      !construct.operations
    ) {
      continue;
    }

    const variable =
      variables.get(construct.name);

    if (!variable) {
      continue;
    }

    if (!variable.operations) {
      variable.operations = [];
    }

    variable.operations.push(
      ...construct.operations
    );
  }

  // Remove standalone operation constructs
  return constructs.filter(
    (construct) =>
      construct.type !== "operation"
  );
}

export function analyzeAST(
  ast: ASTNode,
  language: string
): AlgorithmModel {
  const constructs = analyzeNode(ast);

  const linked =
    linkOperations(constructs);

  return {
    language,
    constructs: linked,
  };
}