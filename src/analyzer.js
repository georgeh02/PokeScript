// ANALYZER
//
// The analyze() function takes the grammar match object (the CST) from Ohm
// and produces a decorated Abstract Syntax "Tree" (technically a graph) that
// includes all entities including those from the standard library.

import * as core from "./core.js"

function must(condition, errorMessage) {
  if (!condition) {
    throw new Error(errorMessage)
  }
}

class Context {
  constructor() {
    this.locals = new Map()
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(name) {
    return this.locals.get(name)
  }
}

export default function analyze(match) {
  let context = new Context()

  function MustBeANumber(e) {
    //   must(e.type === core.Type.INT, "Float or Int expected")
    must(
      [core.Type.INT, core.Type.FLOAT].includes(e.type),
      "Float or Int expected"
    )
  }

  function MustBeABoolean(e) {
    must(e.type === core.Type.BOOLEAN, "Boolean expected")
  }

  function MustHaveSameType(e1, e2) {
    must(e1.type === e2.type, "Same type expected")
  }

  function MustBeDeclared(e, id) {
    must(!!e, `${id.sourceString} not declared`)
  }

  const analyzer = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.children.map((s) => s.rep()))
    },
    PrintStmt(_print, exp) {
      return new core.PrintStatement(exp.rep())
    },
    VarDecl(modifier, id, _eq, exp) {
      const initializer = exp.rep()
      const readOnly = modifier.sourceString === "const"
      const variable = new core.Variable(
        id.sourceString,
        readOnly,
        initializer.type
      )
      context.add(id.sourceString, variable)
      return new core.VariableDeclaration(variable, initializer)
    },
    FunDecl(_fun, id, params, _arrow, types, block) {
      const returnType =
        types.children.length === 0 ? core.Type.VOID : types[0].rep()
      const fun = new core.Function(id.sourceString, returnType)
      return new core.FunctionDeclaration(
        fun,
        id.sourceString,
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
      MustBeABoolean(test)
      const body = block.rep()
      return new core.WhileStatement(test, body)
    },
    LoopStmt_ForEach(_for, type, id, _in, exp, block) {
      const iterator = new core.Variable(
        id.sourceString,
        true,
        collection.type.baseType
      )
      return new core.ForEachStatement(iterator, exp.rep(), block.rep())
    },
    LoopStmt_For(_for, type, id, _eq, exp1, _until, exp2, block) {
      const iterator = new core.Variable(id.sourceString, true, core.Type.INT)
      return new core.ForStatement(
        iterator,
        exp1.rep(),
        exp2.rep(),
        block.rep()
      )
    },
    IfStmt_long(_if, exp, block1, _else, block2) {
      return new core.IfStatement(exp.rep(), block1.rep(), block2.rep())
    },
    IfStmt_elsif(_if, exp, block, _else, ifstmt) {
      return new core.IfStatement(exp.rep(), block.rep(), ifstmt.rep())
    },
    IfStmt_short(_if, exp, block) {
      return new core.ShortItStatement(exp.rep(), block.rep())
    },
    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep())
    },
    ClassDecl(_class, id, _left, constructor, methods, _right) {
      return new core.ClassDeclaration(id, constructor, methods)
    },
    ConstructorDecl(_construct, _left, params, _right, _open, body, _close) {
      return new core.ConstructorDeclaration(params, body)
    },
    Field(type, _this, _dot, id, _eq, exp) {
      return new core.Field(type.rep(), id.sourceString, exp.rep())
    },
    MethodDecl(_function, id, _open, params, _close, _arrow, type, block) {
      return new core.MethodDeclaration(id, params, block, type)
    },
    Exp_ternary(exp, _questionMark, exp1, colon, exp2) {
      return new core.Conditional(exp.rep(), exp1.rep(), exp2.rep())
    },
    Exp0_or(exp, _ops, exps) {
      return new core.BinaryExpression(
        "||",
        exp.rep(),
        exps.asIteration().children.map((e) => e.rep()),
        core.Type.BOOLEAN
      )
    },
    Exp0_and(exp, _ops, exps) {
      return new core.BinaryExpression(
        "&&",
        exp.rep(),
        exps.asIteration().children.map((e) => e.rep()),
        core.Type.BOOLEAN
      )
    },
    Exp1_binary(exp1, relop, exp2) {
      const left = exp1.rep()
      MustBeANumber(left)
      const operator = relop.sourceString
      const right = exp2.rep()
      MustBeANumber(right)
      return new core.BinaryExpression(left, operator, right, core.Type.BOOLEAN)
    },
    Exp2_binary(exp1, addOp, exp2) {
      const exp = exp1.rep()
      MustBeANumber(exp)
      const operator = addOp.sourceString
      const term = exp2.rep()
      MustBeANumber(term)
      return new core.BinaryExpression(exp, operator, term, exp.type)
    },
    Exp3_binary(exp1, mulOp, exp2) {
      const exp = exp1.rep()
      MustBeANumber(exp)
      const operator = mulOp.sourceString
      const term = exp2.rep()
      MustHaveSameType(exp, term)
      return new core.BinaryExpression(exp, operator, term, exp.type)
    },
    Exp4_binary(exp1, powerOp, exp2) {
      const exp = exp1.rep()
      MustBeANumber(exp1)
      const operator = powerOp.sourceString
      const term = exp2.rep()
      MustHaveSameType(exp1, exp2)
      return new core.BinaryExpression(exp, operator, term, exp1.type)
    },
    Exp4_unary(unaryOp, exp) {
      return new core.UnaryExpression(unaryOp.sourceString, exp.rep())
    },
    Exp5_subscript(exp1, _open, exp2, _close) {
      return new core.SubscriptExpression(exp1.rep(), exp2.rep())
    },
    Exp5_id(id) {
      //TODO: check that it hasn't been previously declared
      const entity = context.lookup(id.sourceString)
      MustBeDeclared(entity, id)
      return entity
    },
    Exp5_parens(_open, exp, _close) {
      return exp.rep()
    },
    Type_array(_left, type, _right) {
      return new core.ArrayType(type.rep())
    },
    Type_map(_left, type1, _comma, type2, _right) {
      return new core.MapType(type1.rep(), type2.rep())
    },
    Type_function(_left, types, _right, _arrow, type) {
      return new core.FunctionType(
        types.asIteration().children.map((t) => t.rep()),
        type.rep()
      )
    },
    Type_id(id) {
      return id.sourceString
    },
    intlit(_digits) {
      return BigInt(this.sourceString)
    },
    floatlit(_int, _dot, _fraction, _e, _sign, _exponent) {
      return Number(this.sourceString)
    },
    strlit(_openQuote, _chars, _closeQuote) {
      return this.sourceString
    },
    ArrayLit(_open, exps, _close) {
      return new core.ArrayExpression(
        exps.asIteration().children.map((e) => e.rep())
      )
    },
    MapLit(_open, mapentries, _close) {
      return new core.MapExpression(
        mapentries.asIteration().children.map((m) => m.rep())
      )
    },
    MapEntry(exp5, _colon, exp) {
      return new core.MapEntry(exp5.rep(), exp.rep())
    },
    Member(exp5, _dot, id) {
      return new core.MemberExpression(exp5.rep(), id.sourceString)
    },
    Call(id, _open, exps, _close) {
      return new core.Call(
        id.sourceString,
        exps.asIteration().children.map((e) => e.rep())
      )
    },
    true(_) {
      return true
    },
    false(_) {
      return false
    },
  })

  //   for (const [name, type] of Object.entries(core.standardLibrary)) {
  //     context.add(name, type)
  //   }

  return analyzer(match).rep()
}
