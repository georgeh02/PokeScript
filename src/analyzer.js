// ANALYZER
//
// The analyze() function takes the grammar match object (the CST) from Ohm
// and produces a decorated Abstract Syntax "Tree" (technically a graph) that
// includes all entities including those from the standard library.

import * as core from "./core.js"

function must(condition, message, errorLocation) {
  if (!condition) {
    const prefix = errorLocation.at.source.getLineAndColumnMessage()
    throw new Error(`${prefix}${message}`)
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

  function mustHaveNumericType(e, at) {
    must(
      [core.Type.INT, core.Type.FLOAT].includes(e.type),
      "Expected a number at",
      at
    )
  }

  function mustBeAnInteger(e, at) {
    must(e.type === core.Type.INT, "Integer expected at", at)
  }

  function MustBeABoolean(e, at) {
    must(e.type === core.Type.BOOLEAN, "Boolean expected at", at)
  }

  function MustHaveSameType(e1, e2, at) {
    must(equivalent(e1.type, e2.type), "Operands do not have the same type", at)
  }

  function equivalent(t1, t2) {
    return (
      t1 === t2 ||
      (t1 instanceof core.ArrayType &&
        t2 instanceof core.ArrayType &&
        equivalent(t1.baseType, t2.baseType)) ||
      (t1 instanceof core.FunctionType &&
        t2 instanceof core.FunctionType &&
        equivalent(t1.returnType, t2.returnType) &&
        t1.paramTypes.length === t2.paramTypes.length &&
        t1.paramTypes.every((t, i) => equivalent(t, t2.paramTypes[i])))
    )
  }

  function MustBeDeclared(e, id, at) {
    must(!!e, `${id.sourceString} not declared`, at)
  }

  function mustBeAssignable(source, targetType, at) {
    must(
      source.type === targetType ||
        (source.type instanceof core.ArrayType &&
          targetType instanceof core.ArrayType &&
          source.type.baseType === targetType.baseType),
      "Type mismatch at",
      at
    )
  }

  function mustBeAnArray(e, at) {
    must(e.type instanceof core.ArrayType, "Array expected at", at)
  }

  function mustAllBeSameType(elements, at) {
    const firstType = elements[0].type
    const allSame = elements.slice(1).every((e) => e.type === firstType)
    must(allSame, "Mixed types in array at", at)
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
      const target = exp5.rep()
      const source = exp.rep()
      mustBeAssignable(source, target.type, { at: exp5 })
      return new core.Assignment(target, source)
    },
    Return_exp(_return, exps) {
      return new core.ReturnStatement(exps.children[0].rep())
    },
    Return_short(_return) {
      return new core.ShortReturnStatement()
    },
    LoopStmt_while(_while, exp, block) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
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
      mustHaveNumericType(left, { at: exp1 })
      const operator = relop.sourceString
      const right = exp2.rep()
      mustHaveNumericType(right, { at: exp2 })
      return new core.BinaryExpression(left, operator, right, core.Type.BOOLEAN)
    },
    Exp2_binary(exp1, addOp, exp2) {
      const exp = exp1.rep()
      mustHaveNumericType(exp, { at: exp1 })
      const operator = addOp.sourceString
      const term = exp2.rep()
      mustHaveNumericType(term, { at: exp2 })
      return new core.BinaryExpression(exp, operator, term, exp.type)
    },
    Exp3_binary(exp1, mulOp, exp2) {
      const exp = exp1.rep()
      mustHaveNumericType(exp, { at: exp1 })
      const operator = mulOp.sourceString
      const term = exp2.rep()
      MustHaveSameType(exp, term, { at: mulOp })
      return new core.BinaryExpression(exp, operator, term, exp.type)
    },
    Exp4_binary(exp1, powerOp, exp2) {
      const [exp, operator, term] = [
        exp1.rep(),
        powerOp.sourceString,
        exp2.rep(),
      ]
      mustHaveNumericType(exp, { at: exp1 })
      mustHaveNumericType(term, { at: exp2 })
      return new core.BinaryExpression(exp, operator, term, exp.type)
    },
    Exp4_unary(unaryOp, exp) {
      if (unaryOp.sourceString === "-") {
        mustHaveNumericType(exp.rep(), { at: exp })
      }
      if (unaryOp.sourceString === "!") {
        MustBeABoolean(exp.rep(), { at: exp })
      }
      return new core.UnaryExpression(
        unaryOp.sourceString,
        exp.rep(),
        exp.rep().type
      )
    },
    Exp5_subscript(exp1, _open, exp2, _close) {
      const array = exp1.rep()
      mustBeAnArray(array, { at: exp1 })
      const subscript = exp2.rep()
      mustBeAnInteger(subscript, { at: exp2 })
      return new core.SubscriptExpression(array, subscript, array.type.baseType)
    },
    Exp5_id(id) {
      //TODO: check that it hasn't been previously declared
      const entity = context.lookup(id.sourceString)
      MustBeDeclared(entity, id, { at: id })
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
      const elements = exps.asIteration().children.map((e) => e.rep())
      mustAllBeSameType(elements, { at: exps })
      const arrayType = new core.ArrayType(elements[0].type)
      return new core.ArrayExpression(elements, arrayType)
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
      //   const callee = id.rep()
      //   mustBeCallable(callee, { at: id })
      //   const exps = expList.asIteration().children
      //   const targetTypes =
      //     callee instanceof core.StructType
      //       ? callee.fields.map((f) => f.type)
      //       : callee.type.paramTypes
      //   mustHaveRightNumberOfArguments(exps.length, targetTypes.length, {
      //     at: open,
      //   })
      //   const args = exps.map((exp, i) => {
      //     const arg = exp.rep()
      //     mustBeAssignable(arg, { toType: targetTypes[i] }, { at: exp })
      //     return arg
      //   })
      //   return callee instanceof core.StructType
      //     ? new core.ConstructorCall(callee, args, callee)
      //     : new core.FunctionCall(callee, args, callee.type.returnType)
      return new core.Call(
        id.rep(),
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

  for (const [name, type] of Object.entries(core.standardLibrary)) {
    context.add(name, type)
  }

  return analyzer(match).rep()
}
