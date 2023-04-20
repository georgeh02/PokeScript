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
    VarDecl(type, id, _eq, exp) {},
    FunDecl(_fun, id, params, _arrow, types, block) {},
    Params(_open, params, _close) {},
    Param(type, id) {},
    Assign(exp5, _eq, exp) {},
    Return_exp(_return, exps) {},
    Return_short(_return) {},
    LoopStmt_while(_while, exp, block) {},
    LoopStmt_ForEach(_for, type, id, _in, exp, block) {},
    LoopStmt_For(_for, type, id, _eq, exp1, _until, exp2, block) {},
    IfStmt_long(_if, exp, block1, _else, block2) {},
    IfStmt_elsif(_if, exp, block, _else, ifstmt) {},
    IfStmt_short(_if, exp, block) {},
    Block(_open, statements, _close) {},
    Field(type, _this, _dot, id, _eq, exp) {},
    Exp_ternary(exp, _questionMark, exp1, colon, exp2) {},
    Exp0_or(exp, _ops, exps) {},
    Exp0_and(exp, _ops, exps) {},
    Exp1_binary(exp1, relop, exp2) {},
    Exp2_binary(exp1, addOp, exp2) {},
    Exp3_binary(exp1, mulOp, exp2) {},
    Exp4_binary(exp1, powerOp, exp2) {},
    Exp4_unary(unaryOp, exp) {},
    Exp5_subscript(exp1, _open, exp2, _close) {},
    Exp5_parens(_open, exp, _close) {},
    Type_array(_left, type, _right) {},
    Type_map(_left, type1, _comma, type2, _right) {},
    Type_function(_left, types, _right, _arrow, type) {},
    Type_id(id) {},
    intlit(_digits) {},
    floatlit(_whole, _point, _fraction, _e, _sign, _exponent) {},
    strlit(_openQuote, _chars, _closeQuote) {},
    ArrayLit(_open, exps, _close) {},
    MapLit(_open, mapentries, _close) {},
    MapEntry(exp5, _colon, exp) {},
    Member(_this, _dot, id) {},
    Call(id, _open, exps, _close) {},
    true(_) {},
    false(_) {},
  })

  return analyzer(match).rep()
}
