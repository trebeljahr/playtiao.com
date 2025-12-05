import { useState } from "react";

export default function Page() {
  return (
    <div className="w-screen h-screen bg-orange-300">
      <h1 className="text-black">Tiago 天高</h1>
      <TiagoBoard />
    </div>
  );
}

type PieceState = "black" | "white" | null;

type History = {
  moves: { x: number; y: number; color: "black" | "white" }[];
};

type BoardState = {
  positions: PieceState[][];
  highlightedCluster: { x: number; y: number }[] | null;
  currentTurn: "black" | "white";
  history: History;
};

const initialBoardState: BoardState = {
  positions: Array(19).fill(Array(19).fill(null)),
  highlightedCluster: null,
  currentTurn: "white",
  history: { moves: [] },
};

const TiagoBoard = () => {
  const [boardState, setBoardState] = useState(initialBoardState);

  const clickPosition = (x: number, y: number) => () => {
    if (boardState.positions[y][x] !== null) {
      const connectedCluster = findConnectedCluster(x, y);

      setBoardState((prevState) => ({
        positions: prevState.positions,
        highlightedCluster: connectedCluster,
        currentTurn: prevState.currentTurn,
        history: prevState.history,
      }));

      return;
    }

    setBoardState((state) => {
      const newPositions = state.positions.map((row) => row.slice());
      if (newPositions[y][x] === null) {
        newPositions[y][x] = state.currentTurn;
      }
      return {
        positions: newPositions,
        highlightedCluster: null,
        currentTurn: state.currentTurn === "white" ? "black" : "white",
        history: {
          moves: [...state.history.moves, { x, y, color: state.currentTurn }],
        },
      };
    });
  };

  const findConnectedCluster = (x: number, y: number) => {
    const targetColor = boardState.positions[y][x];
    if (targetColor === null) return [];

    const visited = new Set<string>();
    const cluster: { x: number; y: number }[] = [];
    const stack = [{ x, y }];

    while (stack.length > 0) {
      const { x: currX, y: currY } = stack.pop()!;
      const key = `${currX},${currY}`;
      if (visited.has(key)) continue;
      visited.add(key);
      cluster.push({ x: currX, y: currY });
      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];
      for (const { dx, dy } of directions) {
        const newX = currX + dx;
        const newY = currY + dy;
        if (
          newX >= 0 &&
          newX < 19 &&
          newY >= 0 &&
          newY < 19 &&
          boardState.positions[newY][newX] === targetColor &&
          !visited.has(`${newX},${newY}`)
        ) {
          stack.push({ x: newX, y: newY });
        }
      }
    }

    return cluster;
  };

  return (
    <div
      style={{
        gridTemplateRows: "repeat(19, 1fr)",
        gridTemplateColumns: "repeat(19, 1fr)",
        width: "90vmin",
        height: "90vmin",
      }}
    >
      {boardState.positions.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
          }}
        >
          {row.map((cell, colIndex) => (
            <div
              key={colIndex}
              style={{
                width: 30,
                height: 30,
                borderRadius: 50,

                border: boardState.highlightedCluster?.filter(
                  ({ x, y }) => x === colIndex && y === rowIndex
                ).length
                  ? "3px solid green"
                  : "none",
                backgroundColor:
                  cell === "black"
                    ? "black"
                    : cell === "white"
                    ? "white"
                    : "brown",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={clickPosition(colIndex, rowIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
