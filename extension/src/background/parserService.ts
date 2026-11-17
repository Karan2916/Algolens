import { getParser } from "../parser";
import { analyzeAST } from "../analyzer";
import type { CodeSnapshot, Problem } from "../shared/types";
import type { AlgorithmAnalysis, OptimalExecution } from "../ai/types";
import {
  getAnalysisContextKey,
  getOptimalContextKey,
  isAnalysisContextCurrent,
} from "../ai/analysisContext";
let requestCounter = 0;
type AnalysisResponse = { analysis?: AlgorithmAnalysis };
const pendingRequests = new Map<string, Promise<AnalysisResponse>>();
const MAX_CACHED_ANALYSES = 50;

let lastCode = "";
let timer: ReturnType<typeof setTimeout> | null = null;

export async function reanalyzeExample(
  exampleIndex: number,
  options: { retryOptimal?: boolean } = {}
): Promise<void> {
  const stored = await chrome.storage.local.get([
    "codeSnapshot",
    "problem",
    "algorithmModel",
    "algorithmModelCode",
    "algorithmModelLanguage",
    "algorithmAnalysis",
    "algorithmAnalysisContextKey",
    "algorithmAnalysisCache",
    "optimalExecutionCache",
  ]);

  const snapshot = stored.codeSnapshot as CodeSnapshot | undefined;
  const problem = stored.problem as Problem | undefined;

  if (!problem) {
    console.warn("[AlgoLens] Cannot reanalyze: problem missing from storage");
    return;
  }

  const algorithm =
    snapshot &&
    stored.algorithmModelCode === snapshot.code &&
    stored.algorithmModelLanguage === snapshot.language
      ? stored.algorithmModel
      : undefined;
  const selectedExample =
    problem.examples?.[exampleIndex] ?? problem.examples?.[0];
  const contextKey = getAnalysisContextKey(problem, snapshot, exampleIndex);
  const optimalContextKey = getOptimalContextKey(problem, exampleIndex);
  await chrome.storage.local.set({
    algorithmAnalysisError: null,
    algorithmAnalysisErrorContextKey: contextKey,
  });
  const cachedAnalyses = stored.algorithmAnalysisCache as
    | Record<string, AlgorithmAnalysis>
    | undefined;
  const optimalExecutionCache = stored.optimalExecutionCache as
    | Record<string, OptimalExecution>
    | undefined;
  const cachedOptimal = options.retryOptimal
    ? undefined
    : optimalExecutionCache?.[optimalContextKey];

  if (
    !options.retryOptimal &&
    stored.algorithmAnalysis &&
    stored.algorithmAnalysisContextKey === contextKey &&
    (stored.algorithmAnalysis as AlgorithmAnalysis).myExecutionAvailable !== false
  ) {
    console.log(`[AlgoLens] ⚡ Example ${exampleIndex + 1} already analyzed, skipping fetch`);
    return;
  }

  const cachedAnalysis = options.retryOptimal
    ? undefined
    : cachedAnalyses?.[contextKey];
  if (cachedAnalysis) {
    const latest = await chrome.storage.local.get([
      "codeSnapshot",
      "problem",
      "selectedExampleIndex",
    ]);
    const latestSnapshot = latest.codeSnapshot as CodeSnapshot | undefined;
    const latestProblem = latest.problem as Problem | undefined;
    const latestExampleIndex =
      typeof latest.selectedExampleIndex === "number"
        ? latest.selectedExampleIndex
        : undefined;
    if (
      isAnalysisContextCurrent(
        latestProblem,
        latestSnapshot,
        latestExampleIndex,
        exampleIndex,
        contextKey
      )
    ) {
      await chrome.storage.local.set({
        algorithmAnalysis: cachedAnalysis,
        algorithmAnalysisContextKey: contextKey,
        algorithmAnalysisError: null,
      });
    }
    return;
  }

  // Generate a deterministic cache key matching backend
  const cacheKey = `${contextKey}|retryOptimal=${Boolean(options.retryOptimal)}`;
  const requestId = ++requestCounter;
  console.log(`[AlgoLens][${requestId}] 📦 CacheKey: ${cacheKey}`);
  const baseAnalysis =
    (stored.algorithmAnalysisContextKey === contextKey
      ? stored.algorithmAnalysis as AlgorithmAnalysis | undefined
      : undefined) ?? cachedAnalyses?.[contextKey];

  // If an identical request is already in flight, reuse its promise
  let analysisPromise = pendingRequests.get(cacheKey);
  if (!analysisPromise) {
    console.log(`[AlgoLens][${requestId}] 🔄 No pending request, initiating fetch`);
    analysisPromise = (async () => {
      console.log(`[AlgoLens][${requestId}] 🤖 Sending AI analysis request`);
      const response = await fetch("http://127.0.0.1:3001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem,
          code: snapshot?.code ?? "",
          language: snapshot?.language ?? "unknown",
          model: algorithm,
          selectedExample,
          skipMyExecution: Boolean(options.retryOptimal),
          skipOptimalExecution: Boolean(cachedOptimal),
          retryOptimal: Boolean(options.retryOptimal),
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI backend returned HTTP ${response.status}: ${errorText}`);
      }
      return (await response.json()) as AnalysisResponse;
    })();
    pendingRequests.set(cacheKey, analysisPromise);
  } else {
    console.log(`[AlgoLens][${requestId}] ⏳ Reusing pending request`);
  }

  try {
    const result = await analysisPromise;
    if (!result.analysis) {
      throw new Error("AI backend returned no analysis.");
    }
    const analysis = {
      ...result.analysis,
      ...(options.retryOptimal && baseAnalysis
        ? {
            algorithm: baseAnalysis.algorithm,
            variant: baseAnalysis.variant,
            confidence: baseAnalysis.confidence,
            explanation: baseAnalysis.explanation,
            techniques: baseAnalysis.techniques,
            dataStructures: baseAnalysis.dataStructures,
            complexity: baseAnalysis.complexity,
            visualizationType: baseAnalysis.visualizationType,
            visualizationReason: baseAnalysis.visualizationReason,
            variablesToTrack: baseAnalysis.variablesToTrack,
            visualizationPlan: baseAnalysis.visualizationPlan,
            myExecutionAvailable: baseAnalysis.myExecutionAvailable,
            myExecutionUnavailableReason:
              baseAnalysis.myExecutionUnavailableReason,
          }
        : {}),
      ...(cachedOptimal ? { optimalExecution: cachedOptimal } : {}),
    };
    // Guard against responses for an outdated example, problem, or code snapshot.
    const latest = await chrome.storage.local.get([
      "codeSnapshot",
      "problem",
      "selectedExampleIndex",
      "algorithmAnalysisCache",
      "optimalExecutionCache",
    ]);
    const latestSnapshot = latest.codeSnapshot as CodeSnapshot | undefined;
    const latestProblem = latest.problem as Problem | undefined;
    const latestExampleIndex =
      typeof latest.selectedExampleIndex === "number"
        ? latest.selectedExampleIndex
        : undefined;
    if (
      !isAnalysisContextCurrent(
        latestProblem,
        latestSnapshot,
        latestExampleIndex,
        exampleIndex,
        contextKey
      )
    ) {
      console.warn(`[AlgoLens][${requestId}] ⚠️ Stale response ignored`);
      return;
    }

    const latestCache = latest.algorithmAnalysisCache as
      | Record<string, AlgorithmAnalysis>
      | undefined;
    const nextCache = {
      ...(latestCache ?? {}),
      ...(analysis.myExecutionAvailable === true
        ? { [contextKey]: analysis }
        : {}),
    };
    const cacheKeys = Object.keys(nextCache);
    if (cacheKeys.length > MAX_CACHED_ANALYSES) {
      delete nextCache[cacheKeys[0]];
    }
    const latestOptimalCache = latest.optimalExecutionCache as
      | Record<string, OptimalExecution>
      | undefined;
    const nextOptimalCache = {
      ...(latestOptimalCache ?? {}),
      ...(analysis.optimalExecution?.available
        ? { [optimalContextKey]: analysis.optimalExecution }
        : {}),
    };
    const optimalCacheKeys = Object.keys(nextOptimalCache);
    if (optimalCacheKeys.length > MAX_CACHED_ANALYSES) {
      delete nextOptimalCache[optimalCacheKeys[0]];
    }
    await chrome.storage.local.set({
      algorithmAnalysis: analysis,
      algorithmAnalysisContextKey: contextKey,
      algorithmAnalysisCache: nextCache,
      optimalExecutionCache: nextOptimalCache,
      algorithmAnalysisError: null,
    });
    console.log(`[AlgoLens][${requestId}] ✅ AI Analysis Saved for example ${exampleIndex + 1}`);
  } finally {
    // Clean up pending request entry
    if (pendingRequests.get(cacheKey) === analysisPromise) {
      pendingRequests.delete(cacheKey);
    }
  }
}

export function processSnapshot(snapshot: CodeSnapshot): void {
  const sourceKey = `${snapshot.language}|${snapshot.code}`;
  if (sourceKey === lastCode) {
    return;
  }

  lastCode = sourceKey;

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(async () => {
    const requestId = ++requestCounter;
    let activeContextKey: string | undefined;
    try {
      console.log(`[AlgoLens][${requestId}] 🔍 Processing snapshot...`);

      // Parse when a language-specific parser exists; never reuse an AST
      // produced for an earlier source snapshot.
      const parser = getParser(snapshot.language);
      let algorithm: ReturnType<typeof analyzeAST> | undefined;
      if (parser) {
        try {
          const parsed = await parser.parse(snapshot);
          algorithm = analyzeAST(parsed.tree, snapshot.language);
          console.log(`[AlgoLens][${requestId}] 🌳 AST model generated`);
        } catch (parseError) {
          console.warn(
            `[AlgoLens][${requestId}] ⚠️ Parser could not model the current code; source analysis will continue`,
            parseError
          );
        }
      } else {
        console.warn(
          `[AlgoLens][${requestId}] ⚠️ No structural parser for ${snapshot.language}; analyzing source directly`
        );
      }

      const currentSnapshot = await chrome.storage.local.get("codeSnapshot");
      const currentCodeSnapshot =
        currentSnapshot.codeSnapshot as CodeSnapshot | undefined;
      if (
        currentCodeSnapshot?.code !== snapshot.code ||
        currentCodeSnapshot.language !== snapshot.language
      ) {
        console.warn(`[AlgoLens][${requestId}] ⚠️ Stale parser result ignored`);
        return;
      }

      await chrome.storage.local.set({
        algorithmModel: algorithm ?? null,
        algorithmModelCode: snapshot.code,
        algorithmModelLanguage: snapshot.language,
      });

      console.log(`[AlgoLens][${requestId}] 💾 Current code model saved`);

      // Step 5: Load the problem statement & selected example index
      const stored = await chrome.storage.local.get([
        "problem",
        "selectedExampleIndex",
      ]);

      const problem = stored.problem as Problem | undefined;
      const exampleIndex =
        typeof stored.selectedExampleIndex === "number"
          ? stored.selectedExampleIndex
          : 0;
      const selectedExample =
        problem?.examples?.[exampleIndex] ?? problem?.examples?.[0];
      const contextKey =
        problem
          ? getAnalysisContextKey(problem, snapshot, exampleIndex)
          : undefined;
      activeContextKey = contextKey;

      console.log(
        problem
          ? `[AlgoLens][${requestId}] 📘 Problem: ${problem.title}`
          : `[AlgoLens][${requestId}] ⚠️ No problem in storage`
      );

      // Step 6: Deduplicated fetch to AI backend
      const cacheKey =
        contextKey ??
        JSON.stringify([problem?.title ?? null, exampleIndex, snapshot.language, snapshot.code]);
      console.log(`[AlgoLens][${requestId}] 📦 CacheKey: ${cacheKey.slice(0, 80)}...`);

      const optimalContextKey = problem
        ? getOptimalContextKey(problem, exampleIndex)
        : undefined;
      const storedCache = await chrome.storage.local.get([
        "algorithmAnalysisCache",
        "optimalExecutionCache",
      ]);
      const cachedAnalyses = storedCache.algorithmAnalysisCache as
        | Record<string, AlgorithmAnalysis>
        | undefined;
      const cachedAnalysis = contextKey ? cachedAnalyses?.[contextKey] : undefined;
      const optimalCache = storedCache.optimalExecutionCache as
        | Record<string, OptimalExecution>
        | undefined;
      const cachedOptimal = optimalContextKey
        ? optimalCache?.[optimalContextKey]
        : undefined;

      let analysisPromise = pendingRequests.get(cacheKey);
      if (cachedAnalysis) {
        analysisPromise = Promise.resolve({ analysis: cachedAnalysis });
      } else if (!analysisPromise) {
        console.log(`[AlgoLens][${requestId}] 🤖 Sending to Azure AI backend...`);
        const fetchStart = Date.now();
        analysisPromise = (async () => {
          const response = await fetch(
            "http://127.0.0.1:3001/analyze",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                problem,
                code: snapshot.code,
                language: snapshot.language,
                model: algorithm,
                selectedExample,
                skipOptimalExecution: Boolean(cachedOptimal),
              }),
            }
          );
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `AI backend returned HTTP ${response.status}: ${errorText}`
            );
          }
          const json = (await response.json()) as AnalysisResponse;
          console.log(`[AlgoLens][${requestId}] ⏱️ Azure response in ${Date.now() - fetchStart}ms`);
          return json;
        })();
        pendingRequests.set(cacheKey, analysisPromise);
      } else {
        console.log(`[AlgoLens][${requestId}] ⏳ Reusing pending request`);
      }

      let result: AnalysisResponse;
      try {
        result = await analysisPromise;
      } finally {
        if (pendingRequests.get(cacheKey) === analysisPromise) {
          pendingRequests.delete(cacheKey);
        }
      }

      if (!result.analysis) {
        throw new Error("AI backend returned no analysis.");
      }
      const analysis = {
        ...result.analysis,
        ...(cachedOptimal ? { optimalExecution: cachedOptimal } : {}),
      };

      // Step 7: Stale-response guard
      const latest = await chrome.storage.local.get([
        "codeSnapshot",
        "problem",
        "selectedExampleIndex",
        "algorithmAnalysisCache",
        "optimalExecutionCache",
      ]);
      const latestSnapshot = latest.codeSnapshot as CodeSnapshot | undefined;
      const latestProblem = latest.problem as Problem | undefined;
      const latestExampleIndex =
        typeof latest.selectedExampleIndex === "number"
          ? latest.selectedExampleIndex
          : undefined;
      if (
        !latestSnapshot ||
        latestSnapshot.code !== snapshot.code ||
        latestSnapshot.language !== snapshot.language
      ) {
        console.warn(`[AlgoLens][${requestId}] ⚠️ Stale response ignored (code changed)`);
        return;
      }
      if (
        problem &&
        contextKey &&
        !isAnalysisContextCurrent(
          latestProblem,
          latestSnapshot,
          latestExampleIndex,
          exampleIndex,
          contextKey
        )
      ) {
        console.warn(`[AlgoLens][${requestId}] ⚠️ Stale response ignored (code or problem changed)`);
        return;
      }

      // Step 8: Save the analysis for the side panel
      const latestCache = latest.algorithmAnalysisCache as
        | Record<string, AlgorithmAnalysis>
        | undefined;
      const nextCache = contextKey
        ? {
            ...(latestCache ?? {}),
            ...(analysis.myExecutionAvailable === true
              ? { [contextKey]: analysis }
              : {}),
          }
        : latestCache;
      if (nextCache) {
        const cacheKeys = Object.keys(nextCache);
        if (cacheKeys.length > MAX_CACHED_ANALYSES) {
          delete nextCache[cacheKeys[0]];
        }
      }
      const latestOptimalCache = latest.optimalExecutionCache as
        | Record<string, OptimalExecution>
        | undefined;
      const nextOptimalCache = optimalContextKey
        ? {
            ...(latestOptimalCache ?? {}),
            ...(analysis.optimalExecution?.available
              ? { [optimalContextKey]: analysis.optimalExecution }
              : {}),
          }
        : latestOptimalCache;
      if (nextOptimalCache) {
        const optimalCacheKeys = Object.keys(nextOptimalCache);
        if (optimalCacheKeys.length > MAX_CACHED_ANALYSES) {
          delete nextOptimalCache[optimalCacheKeys[0]];
        }
      }
      await chrome.storage.local.set({
        algorithmAnalysis: analysis,
        ...(contextKey ? { algorithmAnalysisContextKey: contextKey } : {}),
        ...(nextCache ? { algorithmAnalysisCache: nextCache } : {}),
        ...(nextOptimalCache ? { optimalExecutionCache: nextOptimalCache } : {}),
        algorithmAnalysisError: null,
      });

      console.log(`[AlgoLens][${requestId}] ✅ AI Analysis Saved`);
    } catch (error) {
      console.error(`[AlgoLens][${requestId}] ❌ Processing Error:`, error);
      if (!activeContextKey) {
        try {
          const failedContext = await chrome.storage.local.get([
            "problem",
            "codeSnapshot",
            "selectedExampleIndex",
          ]);
          const failedProblem = failedContext.problem as Problem | undefined;
          const failedSnapshot =
            failedContext.codeSnapshot as CodeSnapshot | undefined;
          if (
            failedProblem &&
            failedSnapshot?.code === snapshot.code &&
            failedSnapshot.language === snapshot.language
          ) {
            const failedIndex =
              typeof failedContext.selectedExampleIndex === "number"
                ? failedContext.selectedExampleIndex
                : 0;
            activeContextKey = getAnalysisContextKey(
              failedProblem,
              failedSnapshot,
              failedIndex
            );
          }
        } catch (storageError) {
          console.error("Could not identify failed analysis context:", storageError);
        }
      }
      if (activeContextKey) {
        await chrome.storage.local.set({
          algorithmAnalysisError:
            error instanceof Error ? error.message : String(error),
          algorithmAnalysisErrorContextKey: activeContextKey,
        }).catch((storageError: unknown) => {
          console.error("Failed to persist analysis error:", storageError);
        });
      }
    }
  }, 600);
}
