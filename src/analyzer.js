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
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    inClass = null,
    function: f = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, inClass, function: f })
  }
  add(name, entity) {
    this.locals.set(name, entity)
  }
  lookup(name) {
    return this.locals.get(name) ?? this.parent?.lookup(name)
  }
  newChildContext(props) {
    return new Context({
      ...this,
      ...props,
      parent: this,
      locals: new Map(),
      inClass: null,
    })
  }
}

export default function analyze(match) {
  let context = new Context({})

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

  function mustNotBeReadOnly(e, at) {
    must(!e.readOnly, `Cannot assign to constant ${e.name}`, at)
  }

  function equivalent(t1, t2) {
    return (
      (t1.description ?? t1) === (t2.description ?? t2) ||
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

  function mustNotAlreadyBeDeclared(name, at) {
    //console.log(context)
    must(
      context.lookup(name) === undefined,
      `Identifier ${name} already declared at`,
      at
    )
  }

  function assignable(fromType, toType) {
    return (
      toType == core.Type.ANY ||
      equivalent(fromType, toType) ||
      (fromType instanceof core.FunctionType &&
        toType instanceof core.FunctionType &&
        // covariant in return types
        assignable(fromType.returnType, toType.returnType) &&
        fromType.paramTypes.length === toType.paramTypes.length &&
        // contravariant in parameter types
        toType.paramTypes.every((t, i) =>
          assignable(t, fromType.paramTypes[i])
        ))
    )
  }

  function mustBeAssignable(e, { toType: type }, at) {
    const message = `Cannot assign a ${e.type.description ?? e.type} to a ${
      type.description ?? type
    }`
    must(assignable(e.type, type), message, at)
  }

  //   function mustBeAssignable(source, targetType, at) {
  //     console.log(source.type, targetType)
  //     must(
  //       source.type === targetType ||
  //         (source.type instanceof core.ArrayType &&
  //           targetType instanceof core.ArrayType &&
  //           source.type.baseType === targetType.baseType),
  //       "Type mismatch at",
  //       at
  //     )
  //   }

  function mustBeInAFunction(at) {
    must(context.function, "Return can only appear in a function", at)
  }

  function mustBeInLoop(at) {
    must(context.inLoop, "Break can only appear in a loop", at)
  }

  function mustReturnSomething(f, at) {
    must(
      f.type.returnType !== core.Type.VOID,
      "Cannot return a value from this function",
      at
    )
  }

  function mustNotReturnAnything(f, at) {
    must(
      f.type.returnType === core.Type.VOID,
      "Something should be returned",
      at
    )
  }

  function mustBeReturnable(e, { from: f }, at) {
    mustBeAssignable(e, { toType: f.type.returnType }, at)
  }

  function mustBeCallable(e, at) {
    const callable = e.type instanceof core.FunctionType
    must(callable, "Call of non-function", at)
  }

  function mustBeAnArray(e, at) {
    must(e.type instanceof core.ArrayType, "Array expected at", at)
  }

  function mustAllBeSameType(elements, at) {
    if (elements[0].constructor.name === "MapEntry") {
      const keyType = elements[0].key.type
      const valueType = elements[0].value.type
      const sameKeys = elements
        .slice(1)
        .every((e) => equivalent(e.key.type, keyType))
      const sameValues = elements
        .slice(1)
        .every((e) => equivalent(e.value.type, valueType))
      must(sameKeys && sameValues, "Mixed types in map at", at)
    } else {
      const firstType = elements[0].type
      const allSame = elements
        .slice(1)
        .every((e) => equivalent(e.type, firstType))
      must(allSame, "Mixed types in array at", at)
    }
  }

  function memberMustBeDeclared(object, field, at) {
    must(object.fields.map((f) => f.name).includes(field), "No such field", at)
  }

  function entityMustBeAType(e, at) {
    const types = Object.values(core.Type).map((type) => type.description)
    must(e instanceof core.Type || types.includes(e), "Type expected", at)

    // must(
    //   e instanceof core.Type || core.Type.map((t) => t.description).includes[e],
    //   "Type expected",
    //   at
    // )
  }

  function mustHaveRightNumberOfArguments(argCount, paramCount, at) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`
    must(argCount === paramCount, message, at)
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
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      context.add(id.sourceString, variable)
      return new core.VariableDeclaration(variable, initializer)
    },
    FunDecl(_fun, id, params, _arrow, types, block) {
      const fun = new core.Function(id.sourceString)
      mustNotAlreadyBeDeclared(id.sourceString, { at: id })
      context.add(id.sourceString, fun)
      context = context.newChildContext({ inLoop: false, function: fun })
      const parameters = params.rep()
      const paramTypes = parameters.map((param) => param.type)
      const returnType = types.children?.[0]?.rep() ?? core.Type.VOID
      fun.type = new core.FunctionType(paramTypes, returnType)
      const body = block.rep()
      context = context.parent
      return new core.FunctionDeclaration(
        fun,
        id.sourceString,
        paramTypes,
        body
      )
    },
    Params(_open, params, _close) {
      return params.asIteration().children.map((p) => p.rep())
    },
    Param(type, id) {
      const param = new core.Variable(id.sourceString, false, type.rep())
      mustNotAlreadyBeDeclared(param.name, { at: id })
      context.add(param.name, param)
      return param
    },
    Assign(exp5, _eq, exp) {
      const target = exp5.rep()
      const source = exp.rep()
      mustBeAssignable(source, { toType: target.type }, { at: exp5 })
      mustNotBeReadOnly(target, { at: exp5 })
      return new core.Assignment(target, source)
    },
    Return_exp(returnKeyword, exp) {
      mustBeInAFunction({ at: returnKeyword })
      mustReturnSomething(context.function, { at: returnKeyword })

      const returnExpression = exp.rep()
      mustBeReturnable(
        returnExpression,
        { from: context.function },
        { at: exp }
      )
      return new core.ReturnStatement(returnExpression)
    },
    Return_short(returnKeyword) {
      mustBeInAFunction({ at: returnKeyword })
      mustNotReturnAnything(context.function, { at: returnKeyword })
      return new core.ShortReturnStatement()
    },
    break(breakKeyword) {
      mustBeInLoop({ at: breakKeyword })
      return new core.BreakStatement()
    },
    LoopStmt_while(_while, exp, block) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
      context = context.newChildContext({ inLoop: true })
      const body = block.rep()
      context = context.parent
      return new core.WhileStatement(test, body)
    },
    LoopStmt_ForEach(_for, type, id, _in, exp, block) {
      const collection = exp.rep()
      mustBeAnArray(collection, { at: exp })
      const iterator = new core.Variable(
        id.sourceString,
        true,
        collection.type.baseType
      )
      context = context.newChildContext({ inLoop: true })
      context.add(iterator.name, iterator)
      const body = block.rep()
      context = context.parent
      return new core.ForEachStatement(iterator, collection, body)
    },
    LoopStmt_For(_for, type, id, _eq, exp1, _until, exp2, block) {
      const [low, high] = [exp1.rep(), exp2.rep()]
      mustBeAnInteger(low, { at: exp1 })
      mustBeAnInteger(high, { at: exp2 })
      const iterator = new core.Variable(id.sourceString, true, core.Type.INT)
      context = context.newChildContext({ inLoop: true })
      context.add(id.sourceString, iterator)
      const body = block.rep()
      context = context.parent
      return new core.ForStatement(iterator, low, high, body)
    },
    IfStmt_long(_if, exp, block1, _else, block2) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
      context = context.newChildContext()
      const consequent = block1.rep()
      context = context.parent
      context = context.newChildContext()
      const alternate = block2.rep()
      context = context.parent
      return new core.IfStatement(test, consequent, alternate)
    },
    IfStmt_elsif(_if, exp, block, _else, ifstmt) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
      context = context.newChildContext()
      const consequent = block.rep()
      // Do NOT make a new context for the alternate!
      const alternate = ifstmt.rep()
      return new core.IfStatement(test, consequent, alternate)
    },
    IfStmt_short(_if, exp, block) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
      context = context.newChildContext()
      const consequent = block.rep()
      context = context.parent
      return new core.ShortIfStatement(test, consequent)
    },
    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep())
    },
    ClassDecl(_class, id, _left, constructor, methods, _right) {
      const classType = new core.ClassType(id.sourceString)
      mustNotAlreadyBeDeclared(id.sourceString, { at: _class })
      context.add(id.sourceString, classType)
      methods = methods.children.map((m) => m.rep())
      return new core.ClassDeclaration(classType, constructor.rep(), methods)
    },
    ConstructorDecl(_construct, params, _open, fields, _close) {
      params = params.rep()
      const starter = new core.Constructor("starter", params, [])
      mustNotAlreadyBeDeclared("starter", { at: _construct })
      context.add("starter", starter)
      context = context.newChildContext({ inLoop: false, starter })
      starter.fields = fields.children.map((f) => f.rep())
      context = context.parent
      return new core.ConstructorDeclaration(starter)
    },
    Field(type, _this, _dot, id, _eq, exp) {
      console.log(type.rep())
      entityMustBeAType(type.rep(), { at: type })
      context.add(id.sourceString, exp)
      return new core.Field(type.rep(), id.sourceString, exp.rep())
    },
    MethodDecl(_function, id, params, _arrow, type, block) {
      params = params.rep()

      const method = new core.Function(id.sourceString)
      //mustnotalreadybedeclared

      context.add(id.sourceString, method)
      context = context.newChildContext({ inLoop: false, function: method })

      const paramTypes = params.map((p) => p.type)
      const returnType = type.children?.[0]?.rep() ?? core.Type.VOID
      method.type = new core.FunctionType(paramTypes, returnType)

      const body = block.rep()
      context = context.parent

      return new core.MethodDeclaration(
        method,
        id.sourceString,
        params,
        body,
        returnType
      )
    },
    Exp_ternary(exp, _questionMark, exp1, colon, exp2) {
      const test = exp.rep()
      MustBeABoolean(test, { at: exp })
      const [consequent, alternate] = [exp1.rep(), exp2.rep()]
      MustHaveSameType(consequent, alternate, { at: colon })
      return new core.Conditional(test, consequent, alternate)
    },
    Exp0_or(exp, _ops, exps) {
      let left = exp.rep()
      MustBeABoolean(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        MustBeABoolean(right, { at: e })
        left = new core.BinaryExpression("||", left, right, core.Type.BOOLEAN)
      }
      return left
    },
    Exp0_and(exp, _ops, exps) {
      let left = exp.rep()
      MustBeABoolean(left, { at: exp })
      for (let e of exps.children) {
        let right = e.rep()
        MustBeABoolean(right, { at: e })
        left = new core.BinaryExpression("&&", left, right, core.Type.BOOLEAN)
      }
      return left
    },
    Exp1_binary(exp1, relop, exp2) {
      const left = exp1.rep()

      const operator = relop.sourceString
      const right = exp2.rep()

      if (["<", "<=", ">", ">="].includes(operator)) {
        mustHaveNumericType(left, { at: exp1 })
      }
      MustHaveSameType(left, right, { at: relop })
      return new core.BinaryExpression(operator, left, right, core.Type.BOOLEAN)
    },
    Exp2_binary(exp1, addOp, exp2) {
      const exp = exp1.rep()
      mustHaveNumericType(exp, { at: exp1 })
      const operator = addOp.sourceString
      const term = exp2.rep()
      mustHaveNumericType(term, { at: exp2 })
      return new core.BinaryExpression(operator, exp, term, exp.type)
    },
    Exp3_binary(exp1, mulOp, exp2) {
      const exp = exp1.rep()
      mustHaveNumericType(exp, { at: exp1 })
      const operator = mulOp.sourceString
      const term = exp2.rep()
      MustHaveSameType(exp, term, { at: mulOp })
      return new core.BinaryExpression(operator, exp, term, exp.type)
    },
    Exp4_binary(exp1, powerOp, exp2) {
      const [exp, operator, term] = [
        exp1.rep(),
        powerOp.sourceString,
        exp2.rep(),
      ]
      mustHaveNumericType(exp, { at: exp1 })
      mustHaveNumericType(term, { at: exp2 })
      return new core.BinaryExpression(operator, exp, term, exp.type)
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
      const paramTypes = types.asIteration().children.map((t) => t.rep())
      const returnType = type.rep()
      return new core.FunctionType(paramTypes, returnType)
    },
    Type_id(id) {
      //const entity = context.lookup(id.sourceString)
      //context.add()
      entityMustBeAType(id.sourceString, { at: id })
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
      const entries = mapentries.asIteration().children.map((m) => m.rep())
      mustAllBeSameType(entries, { at: mapentries })
      let mapType
      if (entries.length > 0) {
        mapType = new core.MapType(entries[0].key.type, entries[0].value.type)
      } else {
        mapType = new core.MapType(Type.ANY, Type.ANY)
      }
      return new core.MapExpression(entries, mapType)
    },
    MapEntry(exp5, _colon, exp) {
      return new core.MapEntry(exp5.rep(), exp.rep())
    },
    Member(exp5, _dot, id) {
      const object = exp5.rep()
      console.log(context.lookup(object.name))
      console.log(context)
      //find class called exp5.rep()
      console.log(object)
      memberMustBeDeclared(object.type, id.sourceString, { at: id })
      const field = object.type.fields.find((f) => f.name === id.sourceString)
      return new core.MemberExpression(object, field)
    },
    ObjectDec(_new, id, _open, exps, _close) {
      //mustbedeclared
      const params = exps.asIteration().children.map((e) => e.rep())
      console.log(new core.ClassType(id.sourceString))
      //const object = new core.Class
      console.log(params)
      return new core.ObjectDec(id.sourceString, params)
    },
    Call(id, open, expList, _close) {
      const callee = id.rep()
      mustBeCallable(callee, { at: id })
      const exps = expList.asIteration().children
      const targetTypes = callee.type.paramTypes
      mustHaveRightNumberOfArguments(exps.length, targetTypes.length, {
        at: open,
      })
      const args = exps.map((exp, i) => {
        const arg = exp.rep()
        mustBeAssignable(arg, { toType: targetTypes[i] }, { at: exp })
        return arg
      })
      return new core.Call(callee, args, callee.type.returnType)
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
