# comb 
## is a tiny language for writing parsers in javascript

<img src="https://user-images.githubusercontent.com/27078897/209457424-129db7e2-5653-47df-abd1-0141e24612f4.png" width="100px"/>

`comb` allows you to write parsers in a tagged template literal which can call JavaScript functions that process your tree as you generate it. It's built using [parser combinators](https://en.wikipedia.org/wiki/Parser_combinator). The `comb` language parser itself uses the same underlying parser combinator functions which are used to parse languages whose grammers are written in `comb`. Yeah for recursion!

 `comb` is <4kb minified.

### Example

Here is a `comb` program for some simple arithmetic. The program is parsed and evaluated in a single pass.

```js
import { comb } from "./comb.js";

const skip = ["whitespace"];

const rules = {
  // literals
  "(": "(",
  ")": ")",
  "-": "-",
  "+": "+",
  "/": "/",
  "*": "*",
  "^": "^",

  // can take regex
  number: /[0-9]+\.?[0-9]*/,
  whitespace: /[^\S\r\n]+/,

  // can also use array as value, will match any element
  // ops: ["-", "+", "*", "/", "^"]
}

const parse = comb`
  lexer ${ { rules, skip } }

  number = 'number'
  number -> ${ x => Number(x.value) }

  neg = '-' 'number'
  neg -> ${ x => -Number(x[1].value) }

  op = '+' | '-' | '*' | '/' | '^'
  op -> ${ x => x.value }
  
  paren = '(' ( exp | paren | neg | number ) ')'
  paren -> ${ x => x[1] }
  
  expTerm = ( number | neg | paren ) op ( expTerm | paren | neg | number )

  exp = expTerm | paren | neg | number
  exp -> ${x => evalResult(applyPrecedence(x))}

  exp
`

const funcs = {
  "*": (x, y) => x*y,
  "/": (x, y) => x/y,
  "+": (x, y) => x+y,
  "-": (x, y) => x-y,
  "^": (x, y) => x**y
}

const operators = [
    ["+", "-"],
    ["*", "/"],
    ["^"],
  ];

const getPrecedence = (op) => {
  let prec = -1;

  operators.forEach((group, i) => {
    if (group.includes(op)) prec = i;
  })
  
  return prec;
}

const applyPrecedence = exp => {

  if (!Array.isArray(exp)) return exp;

  const [ first, op, second ] = exp;

  const result = (Array.isArray(second) && getPrecedence(op) > getPrecedence(second[1])) 
    ? applyPrecedence([
        [ first, op, second[0] ], 
        second[1], 
        applyPrecedence(second[2])
      ])
    : [ first, op, applyPrecedence(second) ];
  
  return result;
}

const evalResult = (node) => {
  if (typeof node === "number") return node;
  else {
    const [ left, op, right ] = node;
    return funcs[op](evalResult(left), evalResult(right));
  }
};

const result = parse("2^2 * (3 - 1) - 2^2");

console.log(result); // 4

```

Let's take a closer look at how this program works.

### Lexer

The lexer can take rules for tokenizing the program and an array of what tokens to skip.

These rules can be `String`, `RegEx`, or `Array`.

You can also pass a function to lexer which takes a string and returns an array of tokens.

### Terms

Terms are defined with an `=`. Adjacent terms are "and" and `|` is "or".

There are three modifiers:

- `*` is zero or more
- `+` is one or more
- `?` is optional

You can use `(` and `)` to adjust precedence.

### Transformers

Transformers `->` are JavaScript functions that will receive an array of each element in the term. Each element will be an object with:

```js
{
  type,
  value,
  index
}
```

The return value of the transform will be returned when parsed instead of the default parsed syntax tree.

### Result

The last line in the `comb` program is returned.


<!-- 
any "." seems broken

test option "?"

lexer can be a function
https://github.com/leomcelroy/haystack-morphogenesis/blob/main/wire-logo/parse.js
 -->
