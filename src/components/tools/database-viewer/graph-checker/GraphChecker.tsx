import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Graphics, Container, Text, TextStyle, FillGradient, BlurFilter } from "pixi.js";
import { Network, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import type { TableRelationships, RelationshipEdge } from "@/types";

interface BlockPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  table: TableRelationships;
}

// Color schemes for different complexity levels
const BLOCK_THEMES = {
  low: {
    gradientStart: 0x7c3aed, // violet-600
    gradientEnd: 0x4c1d95,   // violet-900
    glow: 0x8b5cf6,          // violet-500
    border: 0xa78bfa,        // violet-400
  },
  mid: {
    gradientStart: 0xa855f7, // purple-500
    gradientEnd: 0x6b21a8,   // purple-800
    glow: 0xc084fc,          // purple-400
    border: 0xd8b4fe,        // purple-300
  },
  high: {
    gradientStart: 0xfb923c, // orange-400
    gradientEnd: 0xc2410c,   // orange-700
    glow: 0xf97316,          // orange-500
    border: 0xfdba74,        // orange-300
  },
};

const BLOCK_COLORS = {
  low: 0x6b21a8,
  mid: 0x9333ea,
  high: 0xf97316,
  border: 0x4c1d95,
  hover: 0xfbbf24,
  text: 0xffffff,
  line: 0xa855f7,
  lineHover: 0xfbbf24,
  background: 0x0f0f1a,
  scanLine: 0x22d3ee,
};

const CORNER_RADIUS = 12;

export function GraphChecker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const blocksContainerRef = useRef<Container | null>(null);
  const linesContainerRef = useRef<Container | null>(null);
  const scanLineRef = useRef<Graphics | null>(null);
  const blocksRef = useRef<Map<string, { graphics: Graphics; position: BlockPosition }>>(new Map());

  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableRelationships | null>(null);
  const [appReady, setAppReady] = useState(false);

  const {
    relationshipGraph,
    relationshipsLoading,
    loadRelationships,
    activeConnectionId,
    isConnected,
  } = useDatabaseViewerStore();

  const connected = activeConnectionId ? isConnected.get(activeConnectionId) : false;

  // Load relationships when connected
  useEffect(() => {
    if (connected && !relationshipGraph && !relationshipsLoading) {
      loadRelationships();
    }
  }, [connected, relationshipGraph, relationshipsLoading, loadRelationships]);

  const calculateBlockPositions = useCallback(
    (tables: TableRelationships[], width: number, height: number): BlockPosition[] => {
      if (tables.length === 0) return [];

      const padding = 40;
      const gap = 12;
      const availableWidth = width - padding * 2;
      const availableHeight = height - padding * 2;

      const maxComplexity = Math.max(...tables.map((t) => t.complexityScore), 1);
      const sortedTables = [...tables].sort((a, b) => b.complexityScore - a.complexityScore);

      const minBlockSize = 50;
      const maxBlockSize = 120;
      const totalBlocks = tables.length;
      const aspectRatio = availableWidth / availableHeight;
      const cols = Math.max(1, Math.ceil(Math.sqrt(totalBlocks * aspectRatio)));
      const rows = Math.max(1, Math.ceil(totalBlocks / cols));

      const cellWidth = (availableWidth - gap * Math.max(0, cols - 1)) / cols;
      const cellHeight = (availableHeight - gap * Math.max(0, rows - 1)) / rows;
      const baseSize = Math.min(cellWidth, cellHeight, maxBlockSize);

      return sortedTables.map((table, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const complexityRatio = maxComplexity > 0 ? table.complexityScore / maxComplexity : 0.5;
        const sizeFactor = 0.6 + complexityRatio * 0.4;
        const blockSize = Math.max(minBlockSize, baseSize * sizeFactor);

        const cellX = padding + col * (cellWidth + gap);
        const cellY = padding + row * (cellHeight + gap);
        const x = cellX + (cellWidth - blockSize) / 2;
        const y = cellY + (cellHeight - blockSize) / 2;

        return {
          x,
          y,
          width: blockSize,
          height: blockSize,
          table,
        };
      });
    },
    []
  );

  const getBlockTheme = (complexityScore: number, maxComplexity: number) => {
    if (maxComplexity === 0) return BLOCK_THEMES.low;
    const ratio = complexityScore / maxComplexity;
    if (ratio > 0.66) return BLOCK_THEMES.high;
    if (ratio > 0.33) return BLOCK_THEMES.mid;
    return BLOCK_THEMES.low;
  };

  // Create gradient fill for a block
  const createGradientFill = (_width: number, height: number, theme: typeof BLOCK_THEMES.low) => {
    const gradient = new FillGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.gradientStart);
    gradient.addColorStop(1, theme.gradientEnd);
    return gradient;
  };

  const drawRelationshipLines = useCallback(
    (
      container: Container,
      positions: BlockPosition[],
      edges: RelationshipEdge[],
      hoveredTableName: string | null
    ) => {
      container.removeChildren();

      const positionMap = new Map<string, BlockPosition>();
      positions.forEach((p) => positionMap.set(p.table.tableName, p));

      edges.forEach((edge) => {
        const fromPos = positionMap.get(edge.from);
        const toPos = positionMap.get(edge.to);
        if (!fromPos || !toPos) return;

        const isHighlighted =
          hoveredTableName === edge.from || hoveredTableName === edge.to;

        const fromCenterX = fromPos.x + fromPos.width / 2;
        const fromCenterY = fromPos.y + fromPos.height / 2;
        const toCenterX = toPos.x + toPos.width / 2;
        const toCenterY = toPos.y + toPos.height / 2;

        const midX = (fromCenterX + toCenterX) / 2;
        const midY = (fromCenterY + toCenterY) / 2 - 30;

        if (isHighlighted) {
          // Draw glow line behind the main line
          const glowLine = new Graphics();
          glowLine.moveTo(fromCenterX, fromCenterY);
          glowLine.quadraticCurveTo(midX, midY, toCenterX, toCenterY);
          glowLine.stroke({ width: 6, color: BLOCK_COLORS.lineHover, alpha: 0.4 });
          glowLine.filters = [new BlurFilter({ strength: 4 })];
          container.addChild(glowLine);
        }

        // Main line
        const line = new Graphics();
        line.moveTo(fromCenterX, fromCenterY);
        line.quadraticCurveTo(midX, midY, toCenterX, toCenterY);
        line.stroke({
          width: isHighlighted ? 3 : 1.5,
          color: isHighlighted ? BLOCK_COLORS.lineHover : BLOCK_COLORS.line,
          alpha: isHighlighted ? 1 : 0.4,
        });

        container.addChild(line);

        // Add small circles at connection points when highlighted
        if (isHighlighted) {
          const startDot = new Graphics();
          startDot.circle(fromCenterX, fromCenterY, 4);
          startDot.fill({ color: BLOCK_COLORS.lineHover, alpha: 1 });
          container.addChild(startDot);

          const endDot = new Graphics();
          endDot.circle(toCenterX, toCenterY, 4);
          endDot.fill({ color: BLOCK_COLORS.lineHover, alpha: 1 });
          container.addChild(endDot);
        }
      });
    },
    []
  );

  const runScanAnimation = useCallback((scanLine: Graphics, width: number, height: number) => {
    let scanX = 0;
    const scanSpeed = 4;

    const animate = () => {
      scanLine.clear();
      scanLine.moveTo(scanX, 0);
      scanLine.lineTo(scanX, height);
      scanLine.stroke({ width: 2, color: BLOCK_COLORS.scanLine, alpha: 0.6 });

      for (let i = 1; i <= 5; i++) {
        const trailX = scanX - i * 10;
        if (trailX > 0) {
          scanLine.moveTo(trailX, 0);
          scanLine.lineTo(trailX, height);
          scanLine.stroke({ width: 1, color: BLOCK_COLORS.scanLine, alpha: 0.1 * (6 - i) });
        }
      }

      scanX += scanSpeed;
      if (scanX < width + 60) {
        requestAnimationFrame(animate);
      } else {
        scanLine.clear();
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Initialize pixi app
  useEffect(() => {
    // Guard against multiple initializations
    if (!containerRef.current) return;
    if (appRef.current) {
      return;
    }

    const container = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let mounted = true;

    const initApp = async () => {
      try {
        if (!container || !mounted) return;

        // Wait a frame to ensure container has dimensions
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!mounted) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        const app = new Application();
        await app.init({
          background: BLOCK_COLORS.background,
          width,
          height,
          antialias: true,
        });

        if (!mounted) {
          app.destroy(true);
          return;
        }

        container.appendChild(app.canvas);
        appRef.current = app;

        const linesContainer = new Container();
        app.stage.addChild(linesContainer);
        linesContainerRef.current = linesContainer;

        const blocksContainer = new Container();
        app.stage.addChild(blocksContainer);
        blocksContainerRef.current = blocksContainer;

        const scanLine = new Graphics();
        app.stage.addChild(scanLine);
        scanLineRef.current = scanLine;

        // Set up resize observer
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width: newWidth, height: newHeight } = entry.contentRect;
            if (newWidth > 0 && newHeight > 0 && appRef.current) {
              appRef.current.renderer.resize(newWidth, newHeight);
            }
          }
        });
        resizeObserver.observe(container);

        setAppReady(true);
      } catch (err) {
        console.error("[GraphChecker] Failed to initialize pixi app:", err);
      }
    };

    initApp();

    return () => {
      mounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
        blocksContainerRef.current = null;
        linesContainerRef.current = null;
        scanLineRef.current = null;
        setAppReady(false);
      }
    };
  }, []);

  // Draw blocks when app is ready and data is loaded
  useEffect(() => {
    if (!appReady || !relationshipGraph || relationshipGraph.tables.length === 0) return;

    const app = appRef.current;
    const blocksContainer = blocksContainerRef.current;
    const linesContainer = linesContainerRef.current;
    const scanLine = scanLineRef.current;

    if (!app || !blocksContainer || !linesContainer || !scanLine) return;

    // Clean up any existing animation before removing children
    const existingCleanup = (blocksContainer as unknown as { _cleanup?: () => void })._cleanup;
    if (existingCleanup) {
      existingCleanup();
    }

    blocksContainer.removeChildren();
    blocksRef.current.clear();

    const width = app.screen.width;
    const height = app.screen.height;

    if (width === 0 || height === 0) {
      return;
    }

    const positions = calculateBlockPositions(relationshipGraph.tables, width, height);
    const maxComplexity = Math.max(...relationshipGraph.tables.map((t) => t.complexityScore), 1);

    // Animation tracking
    const animatedBlocks: { container: Container; baseY: number; phase: number }[] = [];

    positions.forEach((pos, idx) => {
      const theme = getBlockTheme(pos.table.complexityScore, maxComplexity);

      // Create a container for the block (holds glow + main graphics)
      const blockContainer = new Container();
      blockContainer.x = pos.x;
      blockContainer.y = pos.y;
      blockContainer.eventMode = "static";
      blockContainer.cursor = "pointer";

      // Create glow effect (background layer)
      const glow = new Graphics();
      glow.roundRect(-4, -4, pos.width + 8, pos.height + 8, CORNER_RADIUS + 2);
      glow.fill({ color: theme.glow, alpha: 0.3 });
      glow.filters = [new BlurFilter({ strength: 8 })];
      blockContainer.addChild(glow);

      // Main block with gradient
      const graphics = new Graphics();
      const gradient = createGradientFill(pos.width, pos.height, theme);

      // Draw rounded rectangle with gradient fill
      graphics.roundRect(0, 0, pos.width, pos.height, CORNER_RADIUS);
      graphics.fill(gradient);

      // Add subtle inner highlight
      graphics.roundRect(2, 2, pos.width - 4, pos.height / 3, CORNER_RADIUS - 2);
      graphics.fill({ color: 0xffffff, alpha: 0.1 });

      // Border with theme color
      graphics.roundRect(0, 0, pos.width, pos.height, CORNER_RADIUS);
      graphics.stroke({ width: 2, color: theme.border, alpha: 0.6 });

      blockContainer.addChild(graphics);

      const shortName =
        pos.table.tableName.includes(".")
          ? pos.table.tableName.split(".").pop()!
          : pos.table.tableName;
      const displayName = shortName.length > 10 ? shortName.slice(0, 8) + ".." : shortName;

      const textStyle = new TextStyle({
        fontSize: Math.max(10, Math.min(14, pos.width / 6)),
        fill: BLOCK_COLORS.text,
        fontWeight: "bold",
        dropShadow: {
          color: 0x000000,
          alpha: 0.5,
          blur: 2,
          distance: 1,
        },
      });
      const text = new Text({ text: displayName, style: textStyle });
      text.anchor.set(0.5);
      text.x = pos.width / 2;
      text.y = pos.height / 2;
      blockContainer.addChild(text);

      blockContainer.on("pointerover", () => {
        setHoveredTable(pos.table.tableName);
        // Scale up slightly and increase glow
        blockContainer.scale.set(1.05);
        glow.alpha = 1;
        glow.filters = [new BlurFilter({ strength: 12 })];
      });

      blockContainer.on("pointerout", () => {
        setHoveredTable(null);
        // Reset scale and glow
        blockContainer.scale.set(1);
        glow.alpha = 0.3;
        glow.filters = [new BlurFilter({ strength: 8 })];
      });

      blockContainer.on("pointertap", () => {
        setSelectedTable(pos.table);
      });

      blocksContainer.addChild(blockContainer);
      blocksRef.current.set(pos.table.tableName, { graphics: blockContainer as unknown as Graphics, position: pos });

      // Add to animation list with random phase
      animatedBlocks.push({
        container: blockContainer,
        baseY: pos.y,
        phase: Math.random() * Math.PI * 2,
      });
    });

    // Subtle floating animation
    let animationFrame: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      animatedBlocks.forEach(({ container, baseY, phase }) => {
        container.y = baseY + Math.sin(elapsed * 0.8 + phase) * 2;
      });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    // Clean up animation on unmount (store reference)
    const cleanup = () => cancelAnimationFrame(animationFrame);
    (blocksContainer as unknown as { _cleanup?: () => void })._cleanup = cleanup;

    // Draw initial lines (without hover)
    drawRelationshipLines(linesContainer, positions, relationshipGraph.edges, null);
    runScanAnimation(scanLine, width, height);
  }, [appReady, relationshipGraph, calculateBlockPositions, drawRelationshipLines, runScanAnimation]);

  // Update relationship lines on hover
  useEffect(() => {
    if (!linesContainerRef.current || !relationshipGraph || blocksRef.current.size === 0) return;
    const positions = Array.from(blocksRef.current.values()).map((b) => b.position);
    drawRelationshipLines(
      linesContainerRef.current,
      positions,
      relationshipGraph.edges,
      hoveredTable
    );
  }, [hoveredTable, relationshipGraph, drawRelationshipLines]);

  // Determine what state to show
  const showLoading = !connected || relationshipsLoading;
  const showEmpty = connected && !relationshipsLoading && (!relationshipGraph || relationshipGraph.tables.length === 0);
  const showGraph = connected && !relationshipsLoading && relationshipGraph && relationshipGraph.tables.length > 0;

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Canvas container - always visible to maintain dimensions */}
      <div ref={containerRef} className="flex-1 h-full" />

      {/* Loading state overlay */}
      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-text-tertiary bg-bg-primary z-10">
          <div className="text-center">
            {!connected ? (
              <>
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Connect to a database to view relationships</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
                <p>Loading relationships...</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {showEmpty && (
        <div className="absolute inset-0 flex items-center justify-center text-text-tertiary bg-bg-primary z-10">
          <div className="text-center">
            <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="mb-4">No tables found or no relationships detected</p>
            <button
              onClick={loadRelationships}
              className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 rounded-md text-accent transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Selected table details panel */}
      {selectedTable && showGraph && (
        <div className="w-72 h-full border-l border-border bg-bg-secondary p-4 overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm truncate">{selectedTable.tableName}</h3>
            <button
              onClick={() => setSelectedTable(null)}
              className="text-text-tertiary hover:text-text-primary text-xl leading-none"
            >
              &times;
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-text-tertiary mb-1">Columns</p>
              <p className="font-mono">{selectedTable.columnCount}</p>
            </div>

            <div>
              <p className="text-text-tertiary mb-1">Complexity Score</p>
              <p className="font-mono">{selectedTable.complexityScore.toFixed(2)}</p>
            </div>

            {selectedTable.foreignKeysOut.length > 0 && (
              <div>
                <p className="text-text-tertiary mb-2">
                  References ({selectedTable.foreignKeysOut.length})
                </p>
                <div className="space-y-1">
                  {selectedTable.foreignKeysOut.map((fk, i) => (
                    <div key={i} className="text-xs bg-bg-tertiary rounded px-2 py-1">
                      <span className="text-accent">{fk.sourceColumn}</span>
                      <span className="text-text-tertiary mx-1">&rarr;</span>
                      <span className="text-text-secondary">{fk.targetTable}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTable.foreignKeysIn.length > 0 && (
              <div>
                <p className="text-text-tertiary mb-2">
                  Referenced By ({selectedTable.foreignKeysIn.length})
                </p>
                <div className="space-y-1">
                  {selectedTable.foreignKeysIn.map((fk, i) => (
                    <div key={i} className="text-xs bg-bg-tertiary rounded px-2 py-1">
                      <span className="text-text-secondary">{fk.sourceTable}</span>
                      <span className="text-text-tertiary mx-1">&rarr;</span>
                      <span className="text-accent">{fk.targetColumn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {showGraph && (
        <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-text-tertiary bg-bg-primary/90 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10 shadow-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-md shadow-sm"
              style={{
                background: `linear-gradient(180deg, #7c3aed 0%, #4c1d95 100%)`,
                boxShadow: '0 0 6px rgba(139, 92, 246, 0.4)'
              }}
            />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-md shadow-sm"
              style={{
                background: `linear-gradient(180deg, #a855f7 0%, #6b21a8 100%)`,
                boxShadow: '0 0 6px rgba(192, 132, 252, 0.4)'
              }}
            />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-md shadow-sm"
              style={{
                background: `linear-gradient(180deg, #fb923c 0%, #c2410c 100%)`,
                boxShadow: '0 0 6px rgba(249, 115, 22, 0.4)'
              }}
            />
            <span>High Complexity</span>
          </div>
        </div>
      )}
    </div>
  );
}
