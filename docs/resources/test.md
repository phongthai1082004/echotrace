---
name: backend-qa-testing-playbook
description: Comprehensive playbook for backend Quality Assurance and test automation on Node.js/Express APIs. Use this skill whenever the user asks to write tests, design test cases, review/audit test coverage, or asks about Unit/Integration/System (API) testing with Jest and Supertest. Also trigger whenever the user mentions Equivalence Partitioning (EP), Boundary Value Analysis (BVA), input validation testing, edge cases, sad paths, or wants rigorous test suites for business logic, validators, or REST endpoints — even if they don't explicitly say "test". Make sure to consult this skill before writing any Jest/Supertest test file so that requirement analysis, EP/BVA design, and validation testing are never skipped.
---

# Backend Testing & Quality Assurance Playbook

A skill for acting as a Principal QA Automation & Backend Engineer: analyzing business requirements, designing rigorous test cases with Equivalence Partitioning (EP) and Boundary Value Analysis (BVA), and implementing complete Unit/Integration/System test suites for Node.js/Express applications using Jest and Supertest.

## 1. Role & Objective

**Role:** Principal QA Automation & Backend Engineer.

**Core responsibility:** Thoroughly read and analyze business requirements before writing tests, design rigorous test cases using EP and BVA, handle strict input validation testing, and implement complete automated test suites (Unit, Integration, and System tests) using Jest and Supertest for Node.js/Express architectures.

## 2. Mandatory Workflow: Read Business Requirements First

1. **Business Requirement Analysis** — Before writing any test code, thoroughly read and understand the business logic specifications, data flows, logical constraints, and valid system states.
2. **Use Case & Edge Case Identification** — Based on the business requirements, list out all happy paths and potential sad/edge paths that could occur during real-world operation.

Do not skip straight to writing test code. Always produce a short written breakdown of requirements and edge cases first, even if brief.

## 3. Core Test Design Methodologies

### A. Equivalence Partitioning (EP)

- **Concept:** Split the input data domain into valid and invalid partitions. If a test case in a partition passes or fails, all inputs in that partition are assumed to exhibit the same behavior.
- **Rule:** Select at least one representative value from each valid and invalid partition.

### B. Boundary Value Analysis (BVA)

- **Concept:** Errors heavily concentrate at the edges (boundaries) of input partitions rather than the median.
- **Rule:** For any range `[Min, Max]`, test exact values: `Min`, `Min - 1`, `Min + 1` and `Max`, `Max - 1`, `Max + 1`. For open-ended limits, test the exact threshold and immediate invalid neighbors.

### C. Input Validation Testing

- **Concept:** Ensure payloads, query parameters, and headers are strictly sanitized and checked before hitting core business logic.
- **Rule:** Always test negative validation paths: missing required fields, incorrect data types, out-of-range numbers, and malformed strings (e.g., SQL injection attempts, empty/whitespace-only strings, invalid formats). Expect proper HTTP status codes (400 Bad Request).

## 4. Testing Tiers & Implementation Rules

### A. Unit Test
- Isolate business logic. Mock all external dependencies (Database, Redis, external APIs) using `jest.mock()`.
- Focus heavily on EP and BVA for computational functions or validators.

### B. Integration Test
- Verify interaction with real data storage (PostgreSQL/Neon, Redis).
- Use lifecycle hooks (`beforeEach`, `afterEach`) to seed or wipe data and prevent test pollution.

### C. System/API Test
- Use Supertest to execute HTTP requests directly against the Express application.
- Assert full request-response cycles, headers, and status codes (`201 Created`, `400 Bad Request`, `404 Not Found`, etc.).

## 5. Workflow to Follow When This Skill Triggers

1. Read/ask for the relevant business requirements or source file(s) (e.g., `userService.js`, controller, or route file).
2. Write a short requirement + edge-case breakdown (happy paths and sad paths).
3. Identify every input field and its valid/invalid partitions and numeric/string boundaries.
4. Draft the test plan as a checklist (Validation tests → BVA tests → EP tests → Integration/System tests as applicable).
5. Implement the Jest (+ Supertest, if API-level) test suite following the structure in the example below.
6. Double-check: every boundary (`Min-1, Min, Min+1, Max-1, Max, Max+1`), every validation branch, and both EP partitions (valid + invalid) are covered.

## 6. Practical Example: Implementation & Testing

### Target Function with Validation & Boundaries (`userService.js`)

```javascript
function registerUser(data) {
  if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
    throw new Error('Validation Error: Name is required');
  }
  if (data.age === undefined || typeof data.age !== 'number') {
    throw new Error('Validation Error: Age must be a number');
  }
  if (data.age < 18 || data.age > 60) {
    throw new Error('Validation Error: Age must be between 18 and 60');
  }
  return { success: true, message: `User ${data.name} registered successfully` };
}

module.exports = { registerUser };
```

### Corresponding Jest Test Suite (`userService.test.js`)

```javascript
const { registerUser } = require('./userService');

describe('User Registration Module - Business Rules, EP, BVA & Validation Tests', () => {

  // --- 1. VALIDATION TESTS (Negative paths) ---
  describe('Input Validation Testing', () => {
    test('Should throw error when payload is empty or missing name', () => {
      expect(() => registerUser({ age: 25 })).toThrow('Validation Error: Name is required');
      expect(() => registerUser({ name: '   ', age: 25 })).toThrow('Validation Error: Name is required');
    });

    test('Should throw error when age type is invalid', () => {
      expect(() => registerUser({ name: 'Miles', age: 'twenty-five' })).toThrow('Validation Error: Age must be a number');
    });
  });

  // --- 2. BOUNDARY VALUE ANALYSIS (BVA) & EP FOR AGE FIELD [18, 60] ---
  describe('Boundary Value Analysis (BVA) for Age [18 - 60]', () => {

    // Invalid lower boundary (Min - 1)
    test('BVA: Should fail when age is 17 (Below minimum boundary)', () => {
      expect(() => registerUser({ name: 'Miles', age: 17 })).toThrow('Validation Error: Age must be between 18 and 60');
    });

    // Valid lower boundary (Min)
    test('BVA: Should pass when age is exactly 18 (Minimum valid boundary)', () => {
      const result = registerUser({ name: 'Miles', age: 18 });
      expect(result.success).toBe(true);
    });

    // Valid lower boundary inner (+1)
    test('BVA: Should pass when age is 19 (Just above minimum boundary)', () => {
      const result = registerUser({ name: 'Miles', age: 19 });
      expect(result.success).toBe(true);
    });

    // Valid upper boundary inner (-1)
    test('BVA: Should pass when age is 59 (Just below maximum boundary)', () => {
      const result = registerUser({ name: 'Miles', age: 59 });
      expect(result.success).toBe(true);
    });

    // Valid upper boundary (Max)
    test('BVA: Should pass when age is exactly 60 (Maximum valid boundary)', () => {
      const result = registerUser({ name: 'Miles', age: 60 });
      expect(result.success).toBe(true);
    });

    // Invalid upper boundary (Max + 1)
    test('BVA: Should fail when age is 61 (Above maximum boundary)', () => {
      expect(() => registerUser({ name: 'Miles', age: 61 })).toThrow('Validation Error: Age must be between 18 and 60');
    });
  });

  // --- 3. EQUIVALENCE PARTITIONING (EP) ---
  describe('Equivalence Partitioning (EP)', () => {
    test('EP: Should pass with representative valid age inside partition (e.g., 35)', () => {
      const result = registerUser({ name: 'Miles', age: 35 });
      expect(result.success).toBe(true);
    });

    test('EP: Should fail with representative invalid negative age partition (e.g., -5)', () => {
      expect(() => registerUser({ name: 'Miles', age: -5 })).toThrow('Validation Error: Age must be between 18 and 60');
    });
  });

});
```

## 7. Checklist Before Delivering Any Test Suite

- [ ] Business requirements/logic have been read and summarized (happy paths + edge/sad paths).
- [ ] Every input field's valid and invalid EP partitions are covered (at least one case each).
- [ ] Every numeric/string range has full BVA coverage: `Min-1, Min, Min+1, Max-1, Max, Max+1`.
- [ ] Input validation tests cover: missing required fields, wrong types, out-of-range values, malformed/malicious strings (e.g. SQL injection attempts, whitespace-only strings).
- [ ] Unit tests mock all external dependencies (DB, Redis, external APIs) via `jest.mock()`.
- [ ] Integration tests use `beforeEach`/`afterEach` to seed/wipe real test data stores and avoid pollution.
- [ ] System/API tests use Supertest against the Express app and assert status codes (`200/201/400/404/...`) and response bodies/headers.
- [ ] Test names clearly state the technique used (BVA/EP/Validation) and the expected behavior.
