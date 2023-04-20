import assert from "node:assert/strict"
import parse from "../src/parser.js"

const syntaxChecks = [
  ["all numeric literal forms", "pika 8 * 89.123"],
  ["complex expressions", "pika 83 * ((((-((((13 / 21)))))))) + 1 - 0"],
  ["all unary operators", "pika -3 pika !fail"],
  ["all binary operators", "pika x && y || z * 1 / 2 ** 3 + 4 < 5"],
  ["all arithmetic operators", "poke x = (!3) * 2 + 4 - (-7.3) * 8 ** 13 / 1"],
  ["all relational operators", "poke x = 1<(2<=(3==(4!=(5 >= (6>7)))))"],
  ["all logical operators", "poke x = success && fail || (!fail)"],
  ["the conditional operator", "pika x ? y : z"],
  ["end of program inside comment", "pika 0 ϞϞ(๑⚈ ․̫ ⚈๑)∩ yay"],
  ["comments with no text are ok", "pika 1 ϞϞ(๑⚈ ․̫ ⚈๑)∩\npika 0ϞϞ(๑⚈ ․̫ ⚈๑)∩"],
  ["non-Latin letters in identifiers", "コンパイラ = 100"],
  ["printing a string literal", 'pika "hello 👋"'],
  //["array type for param", "pokeball f(x() -> capture[][]) -> void {}"],
  //["array type returned", "pokeball f() -> pokedollar[] {}"],
  ["nonempty array literal", "pika [1, 2, 3]"],
  ["indexing array literals", "pika [1, 2, 3][1]"],
  ["assignments", "abc = 9 * 3 a=1"],
  ["array var assignment", "c[2] = 100"],
  ["call", "pika 5 * f(x, y, 2 * y)"],
  ["while with empty block", "train success {}"],
  ["while with one statement block", "train success {poke x = 1}"],
  ["negation", "pika -2"],
  ["negation can come second", "pika 2 ** -2"],
]

const syntaxErrors = [
  ["non-letter in an identifier", "ab😭c = 2", /Line 1, col 3/],
  ["malformed number", "x= 2.", /Line 1, col 6/],
  ["a missing right operand", "pika 5 -", /Line 1, col 9/],
  ["a non-operator", "pika 7 * ((2 _ 3)", /Line 1, col 14/],
  ["an expression starting with a )", "x = )", /Line 1, col 5/],
  ["a statement starting with expression", "x * 5", /Line 1, col 3/],
  ["an illegal statement on line 2", "pika 5\nx * 5", /Line 2, col 3/],
  ["a statement starting with a )", "pika 5\n) * 5", /Line 2, col 1/],
  ["an expression starting with a *", "x = * 71", /Line 1, col 5/],
  ["associating relational operators", "pika 1 < 2 < 3", /Line 1, col 12/],
  ["a float with an E but no exponent", "poke x = 5E * 11", /Line 1, col 13/],
  ["while as identifier", "poke train = 3", /Line 1, col 6/],
  ["negation cannot come first", "pika -2 ** 2", /Line 1, col 10/],
]

describe("The parser", () => {
  for (const [scenario, source] of syntaxChecks) {
    it(`accepts ${scenario}`, () => {
      assert(parse(source).succeeded())
    })
  }
  for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
    it(`rejects ${scenario}`, () => {
      assert.throws(() => parse(source), errorMessagePattern)
    })
  }
})
