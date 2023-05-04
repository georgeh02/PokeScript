// import assert from "node:assert/strict"
// import parse from "../src/parser.js"
// import analyze from "../src/analyzer.js"
// import optimize from "../src/optimizer.js"
// import generate from "../src/generator.js"

// function dedent(s) {
//   return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
// }

// const fixtures = [
//   {
//     name: "small",
//     source: `
//       poke x = 3 * 7
//       poke y = success
//       y = 5 ** -x / -100 > - x || fail
//       pika((y && y) || fail || (x*2) != 5)
//     `,
//     expected: dedent`
//       let x_1 = 21
//       let y_2 = true
//       y_2 = (((5 ** -(x_1)) / -(100)) > -(x_1))
//       console.log(((y_2 && y_2) || ((x_1 * 2) !== 5)))
//     `,
//   },
//   {
//     name: "if",
//     source: `
//       poke x = 0
//       catch (x == 0) { pika("1") }
//       catch (x == 0) { pika(1) } release { pika(2) }
//       catch (x == 0) { pika(1) } release catch (x == 2) { pika(3) }
//       catch (x == 0) { pika(1)} release catch (x == 2) { pika(3)} release { pika(4) }
//     `,
//     expected: dedent`
//       let x_1 = 0;
//       if ((x_1 === 0)) {
//         console.log("1")
//       }
//       if ((x_1 === 0)) {
//         console.log(1)
//       } else {
//         console.log(2)
//       }
//       if ((x_1 === 0)) {
//         console.log(1)
//       } else {
//         if ((x_1 === 2)) {
//           console.log(3)
//         }
//       }
//       if ((x_1 === 0)) {
//         console.log(1)
//       } else
//         if ((x_1 === 2)) {
//           console.log(3)
//         } else {
//           console.log(4)
//         }
//     `,
//   },
//   {
//     name: "while",
//     source: `
//       poke x = 0
//       while x < 5 {
//         poke y = 0
//         while y < 5 {
//           pika(x * y)
//           y = y + 1
//           retreat
//         }
//         x = x + 1
//       }
//     `,
//     expected: dedent`
//       let x_1 = 0
//       while ((x_1 < 5)) {
//         let y_2 = 0
//         while ((y_2 < 5)) {
//           console.log((x_1 * y_2))
//           y_2 = (y_2 + 1)
//           break
//         }
//         x_1 = (x_1 + 1)
//       }
//     `,
//   },
//   {
//     name: "functions",
//     source: `
//       poke z = 0.5
//       ability f(pokefloat x, capture y) {
//         pika(sin(x) > π)
//         return
//       }
//       ability g() -> capture {
//         return fail
//       }
//       f(z, g())
//     `,
//     expected: dedent`
//       let z_1 = 0.5
//       function f_2(x_3, y_4) {
//         console.log((Math.sin(x_3) > Math.PI))
//         return
//       }
//       function g_5() {
//         return false
//       }
//       f_2(z_1, g_5())
//     `,
//   },
//   {
//     name: "arrays",
//     source: `
//       poke a = [success, fail, success]
//       poke b = [10, 30]
//       [pokedollar] c = []
//       pika(a[1] || (b[0] < 88 ? fail : success))
//     `,
//     expected: dedent`
//       let a_1 = [true,false,true]
//       let b_2 = [10,30]
//       let c_3 = []
//       console.log((a_1[1] || (((b_2[0] < 88)) ? (false) : (true))))
//     `,
//   },
//   {
//     name: "for loops",
//     source: `
//       evolve pokedollar j in [10, 20, 30] {
//         pika(j)
//       }
//     `,
//     expected: dedent`
//       for (let j_2 of [10,20,30]) {
//         console.log(j_2)
//       }
//     `,
//   },
//   {
//     name: "standard library",
//     source: `
//       poke x = 0.5
//       pika(sin(x) - cos(x) + exp(x) * ln(x) / hypot(2.3, x))
//       pika(bytes("∞§¶•"))
//       pika(codepoints("💪🏽💪🏽🖖👩🏾💁🏽‍♀️"))
//     `,
//     expected: dedent`
//       let x_1 = 0.5
//       console.log(((Math.sin(x_1) - Math.cos(x_1)) + ((Math.exp(x_1) * Math.log(x_1)) / Math.hypot(2.3,x_1))))
//       console.log([...Buffer.from("∞§¶•", "utf8")])
//       console.log([...("💪🏽💪🏽🖖👩🏾💁🏽‍♀️")].map(s=>s.codePointAt(0)))
//     `,
//   },
// ]

// describe("The code generator", () => {
//   for (const fixture of fixtures) {
//     it(`produces expected js output for the ${fixture.name} program`, () => {
//       const actual = generate(optimize(analyze(parse(fixture.source))))
//       assert.deepEqual(actual, fixture.expected)
//     })
//   }
// })
