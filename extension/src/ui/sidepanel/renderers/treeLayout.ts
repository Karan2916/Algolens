import type { TreeVisualState } from "../../../ai/types";

type TreeNode = TreeVisualState["nodes"][number];

export interface PositionedTreeNode extends TreeNode {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export interface TreeLayoutEdge {
  from: PositionedTreeNode;
  to: PositionedTreeNode;
}

export interface TreeLayout {
  nodes: PositionedTreeNode[];
  edges: TreeLayoutEdge[];
  width: number;
  height: number;
}

const LEVEL_GAP = 60;
const SIBLING_GAP = 16;
const NODE_HEIGHT = 28;
const PADDING_X = 24;
const PADDING_Y = 24;

interface TreeFragment {
  nodes: PositionedTreeNode[];
  edges: { fromId: string; toId: string }[];
  minX: number;
  maxX: number;
}

function getNodeWidth(node: TreeNode): number {
  return Math.max(38, node.label.length * 8 + 20);
}

function getContours(nodes: PositionedTreeNode[]) {
  const minByDepth = new Map<number, number>();
  const maxByDepth = new Map<number, number>();

  for (const node of nodes) {
    const left = node.x - node.width / 2;
    const right = node.x + node.width / 2;
    minByDepth.set(node.depth, Math.min(minByDepth.get(node.depth) ?? Infinity, left));
    maxByDepth.set(node.depth, Math.max(maxByDepth.get(node.depth) ?? -Infinity, right));
  }

  return { minByDepth, maxByDepth };
}

function placeFragment(
  fragment: TreeFragment,
  xOffset: number,
  depthOffset: number
): TreeFragment {
  const nodes = fragment.nodes.map((node) => ({
    ...node,
    x: node.x + xOffset,
    y: node.y + depthOffset * LEVEL_GAP,
    depth: node.depth + depthOffset,
  }));

  return {
    nodes,
    edges: fragment.edges,
    minX: fragment.minX + xOffset,
    maxX: fragment.maxX + xOffset,
  };
}

function combineFragments(
  root: PositionedTreeNode,
  children: TreeFragment[],
  rootEdges: { fromId: string; toId: string }[]
): TreeFragment {
  const nodes = [root, ...children.flatMap((child) => child.nodes)];
  const edges = [
    ...rootEdges,
    ...children.flatMap((child) => child.edges),
  ];
  return {
    nodes,
    edges,
    minX: Math.min(...nodes.map((node) => node.x - node.width / 2)),
    maxX: Math.max(...nodes.map((node) => node.x + node.width / 2)),
  };
}

/**
 * Positions binary children using explicit left/right references and
 * recursively measured subtree contours. Trees without side references retain
 * ordered parentId-based layout.
 */
export function layoutTree(tree: TreeVisualState): TreeLayout {
  const rawNodes = tree.nodes ?? [];
  const nodeMap = new Map(rawNodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, TreeNode[]>();

  for (const node of rawNodes) {
    if (node.parentId !== undefined) {
      const children = childrenByParent.get(node.parentId) ?? [];
      children.push(node);
      childrenByParent.set(node.parentId, children);
    }
  }

  const roots = rawNodes.filter(
    (node) => !node.parentId || !nodeMap.has(node.parentId)
  );
  const placedIds = new Set<string>();

  const buildSubtree = (
    nodeId: string,
    path: Set<string>
  ): TreeFragment | undefined => {
    const node = nodeMap.get(nodeId);
    if (!node || path.has(nodeId) || placedIds.has(nodeId)) return undefined;

    placedIds.add(nodeId);
    const nextPath = new Set(path);
    nextPath.add(nodeId);
    const root: PositionedTreeNode = {
      ...node,
      x: 0,
      y: 0,
      width: getNodeWidth(node),
      height: NODE_HEIGHT,
      depth: 0,
    };

    const hasBinaryReferences =
      node.leftId !== undefined || node.rightId !== undefined;
    if (hasBinaryReferences) {
      const left = node.leftId
        ? buildSubtree(node.leftId, nextPath)
        : undefined;
      const right = node.rightId
        ? buildSubtree(node.rightId, nextPath)
        : undefined;

      if (!left && !right) {
        return combineFragments(root, [], []);
      }

      let leftOffset = 0;
      let rightOffset = 0;
      if (left && right) {
        const leftRoot = left.nodes[0];
        const rightRoot = right.nodes[0];
        leftOffset = -(root.width / 2 + SIBLING_GAP + leftRoot.width / 2);
        rightOffset = root.width / 2 + SIBLING_GAP + rightRoot.width / 2;

        const leftContours = getContours(left.nodes);
        const rightContours = getContours(right.nodes);
        const sharedDepths = [...leftContours.maxByDepth.keys()].filter(
          (depth) => rightContours.minByDepth.has(depth)
        );
        let neededGap = SIBLING_GAP;
        for (const depth of sharedDepths) {
          const gap =
            rightContours.minByDepth.get(depth)! +
            rightOffset -
            (leftContours.maxByDepth.get(depth)! + leftOffset);
          neededGap = Math.max(neededGap, SIBLING_GAP - gap);
        }
        if (neededGap > SIBLING_GAP) {
          const extra = neededGap - SIBLING_GAP;
          leftOffset -= extra / 2;
          rightOffset += extra / 2;
        }
      } else if (left) {
        leftOffset = -(root.width / 2 + SIBLING_GAP + left.nodes[0].width / 2);
      } else if (right) {
        rightOffset = root.width / 2 + SIBLING_GAP + right.nodes[0].width / 2;
      }

      const placedChildren: TreeFragment[] = [];
      const rootEdges: { fromId: string; toId: string }[] = [];
      if (left) {
        placedChildren.push(placeFragment(left, leftOffset, 1));
        rootEdges.push({ fromId: node.id, toId: left.nodes[0].id });
      }
      if (right) {
        placedChildren.push(placeFragment(right, rightOffset, 1));
        rootEdges.push({ fromId: node.id, toId: right.nodes[0].id });
      }
      return combineFragments(root, placedChildren, rootEdges);
    }

    const orderedChildren = childrenByParent.get(nodeId) ?? [];
    const childFragments = orderedChildren
      .map((child) => buildSubtree(child.id, nextPath))
      .filter((child): child is TreeFragment => child !== undefined);
    if (childFragments.length === 0) {
      return combineFragments(root, [], []);
    }

    const totalChildrenWidth =
      childFragments.reduce(
        (width, child) => width + child.maxX - child.minX,
        0
      ) +
      SIBLING_GAP * (childFragments.length - 1);
    const childrenStart = -Math.max(root.width, totalChildrenWidth) / 2;
    let cursor = childrenStart;
    const placedChildren: TreeFragment[] = [];
    const rootEdges: { fromId: string; toId: string }[] = [];
    for (const child of childFragments) {
      const width = child.maxX - child.minX;
      const xOffset = cursor - child.minX;
      placedChildren.push(placeFragment(child, xOffset, 1));
      rootEdges.push({ fromId: node.id, toId: child.nodes[0].id });
      cursor += width + SIBLING_GAP;
    }

    return combineFragments(root, placedChildren, rootEdges);
  };

  const fragments: TreeFragment[] = [];
  for (const root of roots) {
    const fragment = buildSubtree(root.id, new Set());
    if (fragment) fragments.push(fragment);
  }

  // Keep disconnected nodes visible rather than silently dropping malformed data.
  for (const node of rawNodes) {
    if (!placedIds.has(node.id)) {
      const fragment = buildSubtree(node.id, new Set());
      if (fragment) fragments.push(fragment);
    }
  }

  const allNodes: PositionedTreeNode[] = [];
  const allEdges: { fromId: string; toId: string }[] = [];
  let rootCursor = PADDING_X;
  for (const fragment of fragments) {
    const width = fragment.maxX - fragment.minX;
    const placed = placeFragment(fragment, rootCursor - fragment.minX, 0);
    allNodes.push(...placed.nodes);
    allEdges.push(...placed.edges);
    rootCursor += width + SIBLING_GAP * 2;
  }

  if (allNodes.length === 0) {
    return { nodes: [], edges: [], width: 280, height: 100 };
  }

  const minX = Math.min(...allNodes.map((node) => node.x - node.width / 2));
  const maxX = Math.max(...allNodes.map((node) => node.x + node.width / 2));
  for (const node of allNodes) node.y += PADDING_Y;
  const maxY = Math.max(...allNodes.map((node) => node.y + node.height / 2));
  const offsetX = PADDING_X - minX;
  for (const node of allNodes) node.x += offsetX;

  const nodesById = new Map(allNodes.map((node) => [node.id, node]));
  const edges = allEdges.flatMap(({ fromId, toId }) => {
    const from = nodesById.get(fromId);
    const to = nodesById.get(toId);
    return from && to ? [{ from, to }] : [];
  });

  return {
    nodes: allNodes,
    edges,
    width: Math.max(280, maxX - minX + PADDING_X * 2),
    height: maxY + PADDING_Y + 10,
  };
}
