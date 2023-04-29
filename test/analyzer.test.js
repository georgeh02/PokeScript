import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

const semanticChecks = [
  ["variables can be printed", "poke x = 1 pika x"],
  ["variables can be reassigned", "poke x = 1 x = (x * 5 / ((-3) + x))"],
  // [
  //   "all predefined identifiers",
  //   "pika ln(sqrt(sin(cos(hypot(π,1) + exp(5.5E2)))))",
  // ],
  ["comparisons", "pika(3<5)"],
  ["additions", "pika 7 - 2 + 5"],
  ["exponentiations", "pika(7 ** 3 ** 2.5 ** 5)"],
  ["negations", "pika (7 * (-3))"],
  ["declared variables", "poke x = 3 pika(x*5)"],
]

const semanticErrors = [
  ["using undeclared identifiers", "pika x", /x not declared/],
  ["a variable used as function", "poke x = 1 x(2)", /Expected "="/],
  [
    "a function used as variable",
    "pika(sin + 1)",
    /Functions can not appear here/,
  ],
  [
    "re-declared identifier",
    "poke x = 1 poke x = 2",
    /Identifier x already declared/,
  ],
  // ["an attempt to write a read-only var", "π = 3", /π is read only/],
  ["too few arguments", "pika(sin())", /1 argument\(s\) required but 0 passed/],
  [
    "too many arguments",
    "pika(sin(5, 10))",
    /1 argument\(s\) required but 2 passed/,
  ],
  ["bad types in comparison", "pika(3<dog)"],
  ["bad types in addition", "pika(false + 1)"],
  ["bad types in multiplication", `pika("x" * 5)`],
  ["non-boolean while test", "evolve 3 {}"],
  ["undeclared in print", "pika x"],
  ["undeclared in add", "pika (x+5)"],
  ["undeclared in negate", "pika(-z)"],
]

// const sample =
//   "poke x=sqrt(9) function f(x)=3*x train(success){x=3 pika(0?f(x)->2)}"

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  // it(`produces the expected graph for the simple sample program`, () => {
  //   const program = analyze(parse(sample))
  //   let x = new core.Variable("x", false)
  //   let f = new core.Function("f", 1)
  //   let localX = new core.Variable("x", true)
  //   assert.deepEqual(
  //     program,
  //     new core.Program([
  //       new core.VariableDeclaration(
  //         x,
  //         new core.Call(core.standardLibrary.sqrt, [9])
  //       ),
  //       new core.FunctionDeclaration(
  //         f,
  //         [localX],
  //         new core.BinaryExpression("*", 3, localX)
  //       ),
  //       new core.WhileStatement(true, [
  //         new core.Assignment(x, 3),
  //         new core.PrintStatement(
  //           new core.Conditional(0, new core.Call(f, [x]), 2)
  //         ),
  //       ]),
  //     ])
  //   )
  // })
})
