// ANALYZER
//
// The analyze() function takes the grammar match object (the CST) from Ohm
// and produces a decorated Abstract Syntax "Tree" (technically a graph) that
// includes all entities including those from the standard library.

import * as core from "./core.js"

export default function analyze(match) {
  const analyzer = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program([])
    },
    PrintStmt(_print, exp) {
      return new core.PrintStatement(exp.rep())
    },
    VarDecl(_let, _const, Type, id, _eq, exp) {},
    FunDecl() {},
    Assign(exp5, _eq, exp) {},
    LoopStmt() {},
    IfStmt() {},
    Return() {},
    Call() {},
    ClassDec() {},
    MemberExpression() {},
    DotCall() {},
    Exp1_Binary() {},
  })

  return analyzer(match).rep()
}
