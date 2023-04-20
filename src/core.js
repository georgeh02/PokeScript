export class Program {
  constructor(statements) {
    this.statements = statements
  }
}

export class PrintStatement {
  constructor(argument) {
    this.argument = argument
  }
}

export class VariableDeclaration {
  constructor(variable, initializer) {
    Object.assign(this, { variable, initializer })
  }
}

export class Variable {
  constructor(name, readOnly, type) {
    Object.assign(this, { name, readOnly, type })
  }
}

export class Type {
  static BOOLEAN = new Type("capture")
  static INT = new Type("pokedollar")
  static FLOAT = new Type("pokefloat")
  static STRING = new Type("pokestring")
  static VOID = new Type("void")
  static ANY = new Type("any")
  constructor(description) {
    // The description is a convenient way to view the type. For basic
    // types or structs, it will just be the names. For arrays, you will
    // see "[T]". For optionals, "T?". For functions "(T1,...Tn)->T0".
    Object.assign(this, { description })
  }
}

export class Field {
  constructor(type, variable, initializer) {
    Object.assign(this, { type, variable, initializer })
  }
}

export class FunctionDeclaration {
  constructor(fun, name, params, body) {
    Object.assign(this, { fun, name, params, body })
  }
}

export class Function {
  constructor(name, type) {
    Object.assign(this, { name, type })
  }
}

export class ArrayType extends Type {
  constructor(baseType) {
    super(`[${baseType.description}]`)
    this.baseType = baseType
  }
}

export class MapType extends Type {
  constructor(keyType, valueType) {
    super(`{${keyType.description} : ${valueType.description}}`)
    this.keyType = keyType
    this.valueType = valueType
  }
}

export class FunctionType extends Type {
  constructor(paramTypes, returnType) {
    super(
      `(${paramTypes.map((t) => t.description).join(",")})->${
        returnType.description
      }`
    )
    Object.assign(this, { paramTypes, returnType })
  }
}

export class Assignment {
  constructor(target, source) {
    Object.assign(this, { target, source })
  }
}

export class BreakStatement {
  // Intentionally empty
}

export class ReturnStatement {
  constructor(expression) {
    Object.assign(this, { expression })
  }
}

export class ShortReturnStatement {
  // Intentionally empty
}

export class IfStatement {
  constructor(test, consequent, alternate) {
    Object.assign(this, { test, consequent, alternate })
  }
}

export class WhileStatement {
  constructor(test, body) {
    Object.assign(this, { test, body })
  }
}

export class ForEachStatement {
  // Example: for ball in balls { ball.bounce();  }
  constructor(iterator, collection, body) {
    Object.assign(this, { iterator, collection, body })
  }
}

export class ForStatement {
  constructor(variable, start, end, body) {
    Object.assign(this, { variable, start, end, body })
  }
}

export class Conditional {
  constructor(test, consequent, alternate) {
    Object.assign(this, { test, consequent, alternate })
    this.type = consequent.type
  }
}

export class BinaryExpression {
  constructor(op, left, right, type) {
    Object.assign(this, { op, left, right, type })
  }
}

export class UnaryExpression {
  constructor(op, operand, type) {
    Object.assign(this, { op, operand, type })
  }
}

export class SubscriptExpression {
  constructor(array, index) {
    Object.assign(this, { array, index })
    this.type = array.type.baseType
  }
}

export class ArrayExpression {
  constructor(elements) {
    this.elements = elements
    this.type = new ArrayType(elements[0].type)
  }
}

export class MapExpression {
  constructor(elements) {
    this.elements = elements
  }
}

export class MapEntry {
  constructor(key, value) {
    this.key = key
    this.value = value
  }
}

export class EmptyArray {
  constructor(type) {
    this.type = type
  }
}

export class MemberExpression {
  constructor(object, member) {
    Object.assign(this, { object, member })
  }
}

export class Call {
  constructor(callee, args, type) {
    Object.assign(this, { callee, args, type })
  }
}

const floatToFloatType = new FunctionType([Type.FLOAT], Type.FLOAT)
const floatFloatToFloatType = new FunctionType(
  [Type.FLOAT, Type.FLOAT],
  Type.FLOAT
)
const stringToIntsType = new FunctionType(
  [Type.STRING],
  new ArrayType(Type.INT)
)
const anysToVoidType = new FunctionType([Type.ANY], Type.VOID)

export const standardLibrary = Object.freeze({
  int: Type.INT,
  float: Type.FLOAT,
  boolean: Type.BOOLEAN,
  string: Type.STRING,
  void: Type.VOID,
  π: new Variable("π", true, Type.FLOAT),
  print: new Function("print", anysToVoidType),
  sin: new Function("sin", floatToFloatType),
  cos: new Function("cos", floatToFloatType),
  exp: new Function("exp", floatToFloatType),
  ln: new Function("ln", floatToFloatType),
  hypot: new Function("hypot", floatFloatToFloatType),
  bytes: new Function("bytes", stringToIntsType),
  codepoints: new Function("codepoints", stringToIntsType),
})

// We want every expression to have a type property. But we aren't creating
// special entities for numbers, strings, and booleans; instead, we are
// just using JavaScript values for those. Fortunately we can monkey patch
// the JS classes for these to give us what we want.
String.prototype.type = Type.STRING
Number.prototype.type = Type.FLOAT
BigInt.prototype.type = Type.INT
Boolean.prototype.type = Type.BOOLEAN
