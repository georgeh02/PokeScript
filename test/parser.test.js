import assert from "node:assert/strict"
import parse from "../src/parser.js"

const syntaxChecks = [
  ["all numeric literal forms", "pika 8 * 1.234 * 1.2E3 * 1.2E+3 * 1.2E-3"],
  ["complex expressions", "pika 83 * ((((-((((13 / 21)))))))) + 1 - 0"],
  ["all unary operators", "pika -3 pika !fail"],
  ["and", "pika x && y"],
  ["or", "pika x || y"],
  ["all arithmetic operators", "poke x = (!3) * 2 + 4 - (-7.3) * 8 ** 13 / 1"],
  ["all relational operators", "poke x = 1<(2<=(3==(4!=(5 >= (6>7)))))"],
  ["or operator", "poke x = success || (!fail)"],

  ["and operator", "poke x = success && (!fail)"],
  ["chained ors", "poke x = 1 || 2 || 3 || 4"],
  ["chained ands", "poke x = 1 && 2 && 3 && 4"],
  ["the conditional operator", "pika x ? y : z"],
  ["end of program inside comment", "pika 0 ϞϞ(๑⚈ ․̫ ⚈๑)∩ yay"],
  ["comments with no text are ok", "pika 1 ϞϞ(๑⚈ ․̫ ⚈๑)∩\npika 0ϞϞ(๑⚈ ․̫ ⚈๑)∩"],
  ["non-Latin letters in identifiers", "コンパイラ = 100"],
  ["printing a string literal", 'pika "hello 👋"'],
  ["nonempty array literal", "pika [1, 2, 3]"],
  ["indexing array literals", "pika [1, 2, 3][1]"],
  ["empty array literal", "pika [pokedollar]"],
  ["assignments", "abc = 9 * 3 a=1"],
  ["array var assignment", "c[2] = 100"],
  ["call", "pika 5 * f(x, y, 2 * y)"],
  ["while with empty block", "while success {}"],
  ["while with one statement block", "while success {poke x = 1}"],
  ["for each with id", "evolve poke x in items {}"],
  ["for each with literal", "evolve poke x in [1, 2, 3] {}"],
  ["for", "evolve pokedollar x = 3 until 5 {}"],
  ["long if", "catch x == 5 {pika 5} release {pika fail}"],
  [
    "else if",
    "catch x == 5 {pika 5 } release catch x == 4 {pika 4} release {pika fail}",
  ],
  ["short if", "catch x == 5 {pika 5}"],
  ["negation", "pika -2"],
  ["negation can come second", "pika 2 ** -2"],
  ["variable declaration", "poke x = 4 \n const b = fail \n pokedollar x = 4"],
  ["function with no params, no return type", "ability f() {}"],
  ["function with one param", "ability f(pokedollar x) {}"],
  ["function with two params", "ability f(pokedollar x, capture y) {}"],
  ["function with no params + return type", "ability f() -> pokedollar {}"],
  ["function types in params", "ability f((pokedollar)->capture g) {}"],
  [
    "function types returned",
    "ability f() -> (pokedollar)->(pokedollar)->void {}",
  ],
  ["array type for return", "ability f() -> [pokedollar] {}"],
  ["array type for param", "ability f([pokedollar] x) {}"],
  ["map type for return", "ability f() -> {pokedollar, pokestring} {}"],
  ["map type for param", "ability f({pokedollar, pokestring} x) {}"],
  ["nonempty map", "{pokedollar, pokedollar} x =  {5: 3, 2: 5, 6: 8}"],
  ["empty map", "{pokedollar, pokestring} x = {}"],
  ["member expression", "pika x.append"],
  [
    "class declaration",
    "train Pokemon{starter(pokedollar x) {pokedollar this.level = x} ability attack() -> pokedollar {return 5}}",
  ],
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
  ["while as identifier", "poke while = 3", /Line 1, col 6/],
  ["if as identifier", "poke catch = 8", /Line 1, col 6/],
  ["while without braces", "while true\n pika 1", /Line 2, col 2/],
  ["if without braces", "catch x < 3 \n pika 1", /Line 2, col 2/],
  ["negation cannot come first", "pika -2 ** 2", /Line 1, col 10/],
  ["unbalanced brackets", "ability f() -> pokedollar {", /Line 1, col 28/],
  [("bad array literal", "pika [1,2,]", /Line 1, col 12/)],
  ["empty subscript", "pika a[]", /Line 1, col 9/],
  ["true is not assignable", "success = 1", /Line 1, col 8/],
  ["false is not assignable", "fail = 1", /Line 1, col 5/],
  ["numbers cannot be subscripted", "pika 500[x]", /Line 1, col 12/],
  ["numbers cannot be called", "pika 500(x)", /Line 1, col 12/],
  ["numbers cannot be dereferenced", "pika 500 .x", /Line 1, col 10/],
  ["string lit with newline", 'pika("ab\\zcdef")', /col 9/],
  ["string lit with quote", 'pika("ab\\zcdef")', /col 9/],
  [
    "incorrect map declaration",
    "{pokedollar, pokedollar} x = {1, 2}",
    /col 32/,
  ],
  ["incorrect map assignment", "x = {1, 2}", /col 7/],
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
