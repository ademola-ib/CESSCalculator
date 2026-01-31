/**
 * Linear Algebra Utilities for Structural Analysis
 * Matrix operations, Gaussian elimination, etc.
 */

/**
 * Matrix type (2D array of numbers)
 */
export type Matrix = number[][];

/**
 * Vector type (1D array of numbers)
 */
export type Vector = number[];

/**
 * Create a zero matrix of given dimensions
 */
export function createZeroMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

/**
 * Create a zero vector of given length
 */
export function createZeroVector(length: number): Vector {
  return Array(length).fill(0);
}

/**
 * Create an identity matrix of given size
 */
export function createIdentityMatrix(size: number): Matrix {
  const matrix = createZeroMatrix(size, size);
  for (let i = 0; i < size; i++) {
    matrix[i][i] = 1;
  }
  return matrix;
}

/**
 * Deep copy a matrix
 */
export function copyMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row]);
}

/**
 * Deep copy a vector
 */
export function copyVector(vector: Vector): Vector {
  return [...vector];
}

/**
 * Add two matrices
 */
export function addMatrices(a: Matrix, b: Matrix): Matrix {
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error("Matrix dimensions must match for addition");
  }
  return a.map((row, i) => row.map((val, j) => val + b[i][j]));
}

/**
 * Multiply matrix by scalar
 */
export function scaleMatrix(matrix: Matrix, scalar: number): Matrix {
  return matrix.map((row) => row.map((val) => val * scalar));
}

/**
 * Multiply two matrices
 */
export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  if (a[0].length !== b.length) {
    throw new Error(
      `Matrix dimensions incompatible for multiplication: ${a.length}x${a[0].length} * ${b.length}x${b[0].length}`
    );
  }

  const result = createZeroMatrix(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      for (let k = 0; k < a[0].length; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

/**
 * Multiply matrix by vector
 */
export function multiplyMatrixVector(matrix: Matrix, vector: Vector): Vector {
  if (matrix[0].length !== vector.length) {
    throw new Error("Matrix columns must match vector length");
  }

  return matrix.map((row) =>
    row.reduce((sum, val, j) => sum + val * vector[j], 0)
  );
}

/**
 * Transpose a matrix
 */
export function transposeMatrix(matrix: Matrix): Matrix {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, j) => matrix.map((row) => row[j]));
}

/**
 * Solve system of linear equations Ax = b using Gaussian elimination with partial pivoting
 * Returns the solution vector x
 */
export function solveLinearSystem(A: Matrix, b: Vector): Vector {
  const n = A.length;

  // Validate dimensions
  if (n === 0) return [];
  if (A[0].length !== n) {
    throw new Error("Matrix A must be square");
  }
  if (b.length !== n) {
    throw new Error("Vector b must have same length as matrix rows");
  }

  // Create augmented matrix [A|b]
  const augmented = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot (maximum absolute value in column)
    let maxRow = col;
    let maxVal = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(augmented[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    // Swap rows if needed
    if (maxRow !== col) {
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    }

    // Check for singular matrix
    if (Math.abs(augmented[col][col]) < 1e-12) {
      throw new Error(`Singular matrix encountered at column ${col}`);
    }

    // Eliminate column entries below pivot
    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / augmented[col][col];
      for (let j = col; j <= n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }

  // Back substitution
  const x = createZeroVector(n);
  for (let row = n - 1; row >= 0; row--) {
    let sum = augmented[row][n]; // b value
    for (let j = row + 1; j < n; j++) {
      sum -= augmented[row][j] * x[j];
    }
    x[row] = sum / augmented[row][row];
  }

  return x;
}

/**
 * Solve banded system (for efficiency with sparse beam/frame matrices)
 * Uses bandwidth to reduce computation
 */
export function solveBandedSystem(
  A: Matrix,
  b: Vector,
  bandwidth: number
): Vector {
  // For now, use full Gaussian elimination
  // Can be optimized later for large systems
  return solveLinearSystem(A, b);
}

/**
 * Calculate matrix determinant (for small matrices)
 */
export function determinant(matrix: Matrix): number {
  const n = matrix.length;

  if (n === 1) return matrix[0][0];
  if (n === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }

  let det = 0;
  for (let j = 0; j < n; j++) {
    det += Math.pow(-1, j) * matrix[0][j] * determinant(minor(matrix, 0, j));
  }
  return det;
}

/**
 * Get minor matrix (matrix with row i and column j removed)
 */
function minor(matrix: Matrix, row: number, col: number): Matrix {
  return matrix
    .filter((_, i) => i !== row)
    .map((r) => r.filter((_, j) => j !== col));
}

/**
 * Invert a matrix (for small matrices)
 */
export function invertMatrix(matrix: Matrix): Matrix {
  const n = matrix.length;
  const det = determinant(matrix);

  if (Math.abs(det) < 1e-12) {
    throw new Error("Matrix is singular, cannot invert");
  }

  if (n === 1) {
    return [[1 / matrix[0][0]]];
  }

  if (n === 2) {
    return scaleMatrix(
      [
        [matrix[1][1], -matrix[0][1]],
        [-matrix[1][0], matrix[0][0]],
      ],
      1 / det
    );
  }

  // For larger matrices, use adjugate method
  const adjugate = createZeroMatrix(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      adjugate[j][i] = Math.pow(-1, i + j) * determinant(minor(matrix, i, j));
    }
  }

  return scaleMatrix(adjugate, 1 / det);
}

/**
 * Print matrix for debugging
 */
export function printMatrix(matrix: Matrix, label?: string): void {
  if (label) console.log(label + ":");
  matrix.forEach((row, i) => {
    console.log(
      `  [${row.map((v) => v.toFixed(4).padStart(10)).join(", ")}]`
    );
  });
}

/**
 * Print vector for debugging
 */
export function printVector(vector: Vector, label?: string): void {
  if (label) console.log(label + ":");
  console.log(`  [${vector.map((v) => v.toFixed(4)).join(", ")}]`);
}

/**
 * Check if matrix is symmetric (within tolerance)
 */
export function isSymmetric(matrix: Matrix, tolerance = 1e-10): boolean {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(matrix[i][j] - matrix[j][i]) > tolerance) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Condition number estimate (ratio of max to min diagonal)
 * Useful for detecting ill-conditioned systems
 */
export function conditionEstimate(matrix: Matrix): number {
  const diag = matrix.map((row, i) => Math.abs(row[i]));
  const maxDiag = Math.max(...diag);
  const minDiag = Math.min(...diag);

  if (minDiag < 1e-12) return Infinity;
  return maxDiag / minDiag;
}
