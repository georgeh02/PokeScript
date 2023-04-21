// ANALYZER
//
// The analyze() function takes the grammar match object (the CST) from Ohm
// and produces a decorated Abstract Syntax "Tree" (technically a graph) that
// includes all entities including those from the standard library.

import * as core from "./core.js"

export default function analyze(match) {
  const analyzer = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.children.map((s) => s.rep()))
    },
    PrintStmt(_print, exp) {
      return new core.PrintStatement(exp.rep())
    },
    VarDecl(type, id, _eq, exp) {
      const initializer = exp.rep()
      const variable = new core.Variable(id.sourceString)
      return new core.VariableDeclaration(variable, initializer)
    },
    FunDecl(_fun, id, params, _arrow, types, block) {
      const returnType =
        types.children.length === 0 ? core.Type.VOID : types[0].rep()
      const fun = new core.Function(id.sourceString, returnType)
      return new core.FunctionDeclaration(
        fun,
        id.rep(),
        params.rep(),
        block.rep()
      )
    },
    Params(_open, params, _close) {
      return params.asIteration().children.map((p) => p.rep())
    },
    Param(type, id) {
      return new core.Variable(id.sourceString, false, type.rep())
    },
    Assign(exp5, _eq, exp) {
      return new core.Assignment(exp5.rep(), exp.rep())
    },
    Return_exp(_return, exps) {
      return new core.ReturnStatement(exps.children[0].rep())
    },
    Return_short(_return) {
      return new core.ShortReturnStatement()
    },
    LoopStmt_while(_while, exp, block) {
      const test = exp.rep()
      const body = block.rep()
      return new core.WhileStatement(test, body)
    },
    LoopStmt_ForEach(_for, type, id, _in, exp, block) {},
    LoopStmt_For(_for, type, id, _eq, exp1, _until, exp2, block) {},
    IfStmt_long(_if, exp, block1, _else, block2) {},
    IfStmt_elsif(_if, exp, block, _else, ifstmt) {},
    IfStmt_short(_if, exp, block) {},
    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep())
    },
    Field(type, _this, _dot, id, _eq, exp) {},
    Exp_ternary(exp, _questionMark, exp1, colon, exp2) {},
    Exp0_or(exp, _ops, exps) {},
    Exp0_and(exp, _ops, exps) {},
    Exp1_binary(exp1, relop, exp2) {
      const left = exp1.rep()
      const operator = relop.sourceString
      const right = exp2.rep()
      return new core.BinaryExpression(left, operator, right)
    },
    Exp2_binary(exp1, addOp, exp2) {
      const exp = exp1.rep()
      const operator = addOp.sourceString
      const term = exp2.rep()
      return new core.BinaryExpression(exp, operator, term)
    },
    Exp3_binary(exp1, mulOp, exp2) {
      const exp = exp1.rep()
      const operator = mulOp.sourceString
      const term = exp2.rep()
      return new core.BinaryExpression(exp, operator, term)
    },
    Exp4_binary(exp1, powerOp, exp2) {
      const exp = exp1.rep()
      const operator = powerOp.sourceString
      const term = exp2.rep()
      return new core.BinaryExpression(exp, operator, term)
    },
    Exp4_unary(unaryOp, exp) {},
    Exp5_subscript(exp1, _open, exp2, _close) {
      return new core.SubscriptExpression(exp1.rep(), exp2.rep())
    },
    Exp5_id(id) {
      //TODO: check that it hasn't been previously declared
      return id.sourceString
    },
    Exp5_parens(_open, exp, _close) {},
    Type_array(_left, type, _right) {
      return new core.ArrayType(type.rep())
    },
    Type_map(_left, type1, _comma, type2, _right) {},
    Type_function(_left, types, _right, _arrow, type) {},
    Type_id(id) {
      return id.sourceString
    },
    intlit(_digits) {},
    floatlit(_int, _dot, _fraction, _e, _sign, _exponent) {
      return Number(this.sourceString)
    },
    strlit(_openQuote, _chars, _closeQuote) {
      return this.sourceString
    },
    ArrayLit(_open, exps, _close) {},
    MapLit(_open, mapentries, _close) {},
    MapEntry(exp5, _colon, exp) {},
    Member(_this, _dot, id) {},
    Call(id, _open, exps, _close) {},
    true(_) {
      return true
    },
    false(_) {
      return false
    },
  })

  return analyzer(match).rep()
}
