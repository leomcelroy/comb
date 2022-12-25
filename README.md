# comb 
## is a tiny language for writing parsers in javascript

![image](https://user-images.githubusercontent.com/27078897/209457424-129db7e2-5653-47df-abd1-0141e24612f4.png)

comb programs are written like parsing expression grammers in a tagged template literal

### Example

Here is a comb program for some simple arithmetic. The program is parsed and evaluated in a single pass.

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
  number: /-?[0-9]+\.?[0-9]*/,
  whitespace: /[^\S\r\n]+/,

  // can also use array as value, will match any element
  // ops: ["-", "+", "*", "/", "^"]
}

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

const evalResult = ([first, op, second]) => funcs[op](first, second);

const applyPrecedence = exp => {

  if (!Array.isArray(exp)) return exp;

  const [ first, op, second ] = exp;

  const result = (Array.isArray(second) && getPrecedence(op) > getPrecedence(second[1])) 
    ? [
        evalResult([ first, op, second[0] ]), 
        second[1], 
        applyPrecedence(second[2])
      ]
    : [ first, op, applyPrecedence(second) ];
  
  return evalResult(result);
}

const parse = comb`
  lexer ${ { rules, skip } }

  
  number = 'number'
  number -> ${ x => Number(x.value) }

  op = '+' | '-' | '*' | '/' | '^'
  op -> ${ x => x.value }

  
  paren = '(' exp ')'
  paren -> ${ x => x[1] }
  
  expTerm = ( number | paren ) op ( expTerm | paren | number )

  exp = expTerm
  exp -> ${applyPrecedence}

  body = exp | paren | number
`

const result = parse("3^2*(9-3)/3");

console.log(result); // 18

```

Let's take a closer look at how this program works.

### Lexer

The lexer can take rules for tokenizing the program and a list of what tokens to skip.

These rules can be `String`, `RegEx`, or `Array`.

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
