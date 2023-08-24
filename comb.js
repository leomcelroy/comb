import { makeLexer } from "./makeLexer.js";

const convert = pred => s => {
  return s[0] && (s[0].type === pred)
    ? [ s[0], s.slice(1) ] 
    : null
}

const star = (pred, transform = null) => s => { // 0 or more
  if (typeof pred === "string") pred = convert(pred);

  const arr = [];
  let next = pred(s);

  while (next) {
    arr.push(next);
    next = pred(next[1]);
  }

  return arr.length > 0 
    ? [ ( transform ? transform(arr.map(([x]) => x)) : arr.map(([x]) => x) ), arr[arr.length - 1][1] ] 
    : [[], s];
}

const plus = (pred, transform = null) => s => { // at least one
  if (typeof pred === "string") pred = convert(pred);

  const arr = [];
  let next = pred(s);

  while (next) {
    arr.push(next);
    next = pred(next[1]);
  }

  return arr.length > 0
    ? [ ( transform ? transform(arr.map(([x]) => x)) : arr.map(([x]) => x) ), arr[arr.length - 1][1] ] 
    : null;
}

const or = (preds, transform = null) => s => {
    const result = preds.reduce((acc, cur) => 
        acc || (typeof cur === "string" ? convert(cur) : cur)(s)
      , false);

    return Array.isArray(result) 
      ? (transform ? [ transform(result[0]), result[1] ] : result)
      : null;
}

const and = (preds, transform = null) => s => { // must match each predicate
  const result = [];
  for (let pred of preds) {
    if (typeof pred === "string") pred = convert(pred);

    const next = pred(s);
    if (next === null) return null;
    s = next[1];
    result.push(next[0])
  }
  
  return result.length === preds.length 
    ? [transform ? transform(result) : result, s] 
    : null;
}

const opt = pred => s => { // optional
  if (typeof pred === "string") pred = convert(pred);

  const next = pred(s);
  if (next === null) return [null, s]; // should I use null or []
  else return next;
}

// const trim = pred => or([ // not used
//   and(["ws", pred, "ws"], ([_0, x, _1]) => x),
//   and([pred, "ws"], ([x, _]) => x),
//   and(["ws", pred], ([_, x]) => x),
//   pred
// ])

const none = () => s => [ null, s ]; // not used

const any = () => s => [ s[0], s.slice(1) ]; // not used

///////////////////

// class Stream { // not used
//   constructor(ast) {
//     this.index = 0;
//     this.ast = ast;
//   }

//   peek() {
//     return this.ast[this.index];
//   }

//   next() {
//     const current = this.ast[this.index];
//     this.index++;
//     return current;
//   }

//   eof() {
//     return this.peek() === undefined;
//   }
// }

//////////////////////////////

// plus, star, or, and, optional

const comb = (strs, ...vals) => {
  let result = "";
  let refs = {};
  strs.forEach((str, i) => {
    if (i >= vals.length) result = result + str;
    else {
      const val = vals[i];
      if (typeof val === "function" || typeof val === "object") {
        let tempName = `$f${i}`;
        refs[tempName] = val;
        result = result + str + tempName; 
      } else if (typeof val === "string" || typeof val === "number") {
        result = result + str + val; 
      } else {
        console.error("Unexpected interpolated value:", val);
      }
    } 
  })

  const skip = ["ws", "comment"];
  const literals = ["->", "=", "|", "*", "+", "?", "(", ")", "lexer"]
    .reduce((acc, cur) => {
      acc[cur] = cur;

      return acc;
    }, {});

  const tokenRules = {
    ws: /[^\S\r\n]+/,
    newline: /\n+/,
    func: /\$f[0-9]+/,
    symbol: /[a-zA-Z_]+/,
    comment: /\/\/.*\n/,
    token: /'.*?'/,
    literal: /"([^"]*)"/,
    ...literals,
  }

  const tokenize = makeLexer({ rules: tokenRules, skip });

  const toks = tokenize(result);

  const token = or(["token"], x => ({ type: "token", value: x.value.slice(1, -1), index: x.index}))
  const literal = or(["literal"], x => ({ type: "literal", value: x.value.slice(1, -1), index: x.index}))

  const andClause = s => plus(and([
    or([paren, "symbol", token, literal]),
    opt(or(["*", "+", "?"])),
  ], x => x[1] ? [x[1].value, x[0]] : x[0]), x => x.length > 1 ? ["and", ...x] : x[0])(s);

  const orClause = s => 
    and([ 
      andClause, 
      plus(
        and([
          opt("newline"),
          "|",
          andClause
        ], x => x[2])
      ) 
    ], x => x[1].length > 0 ? ["or", x[0], ...x[1]] : x[0])(s);

  const paren = s => and(["(", or([ orClause, andClause ]), ")"], x => x[1])(s);

  const production = s => and([ "symbol", "=", or([orClause, andClause, "newline"]) ], x => ["set", x[0].value, x[2]])(s);

  const transformation = s => and(["symbol", "->", "func"], x => ["transform", x[0].value, x[2]])(s);

  const lexer = s => and(["lexer", "func"], x => ({ type: "lexer", value: x[1] }))(s);

  const statement = s => or([ production, transformation, lexer, orClause, andClause ])(s);

  const parse = star(or([statement, "newline"]), x => x.filter(x => !["newline", "comment"].includes(x.type)));

  // check that last line is or or and

  const [ ast, remainder ] = parse(toks);

  const last = ast.at(-1);
  const validReturn = ["*", "?", "+", "or", "and"].includes(last[0]);
  
  // if (!validReturn) return console.error(`Must end with [* | ? | + | or | and] clause.`)

  let $lexer = null;
  const $stored = {};
  const $transforms = {};

  const funcs = {
    "or": (...args) => or(args),
    "and": (...args) => and(args),
    "transform": (name, value) => {
      $transforms[name] = value; 
      return value;
    },
    "set": (name, value) => {
      $stored[name] = value;
      return value; 
    },
    "*": (...args) => star(...args),
    "+": (...args) => plus(...args),
    "?": (...args) => opt(...args),
  }

  const funcsTransform = {
    "or": (arr, trans) => or(arr, trans),
    "and": (arr, trans) => and(arr, trans),
    "*": (term, trans) => star(term[0], trans),
    "+": (term, trans) => plus(term[0], trans),
    "?": (term, trans) => opt(term[0], trans),
  }

  const evaluate = node => {

    if (Array.isArray(node)) {
      const [head, ...tail] = node;

      // if set and set name in transform, pass transform
      if (head === "set" && tail[0] in $transforms) {
        if (!Array.isArray(tail[1])) tail[1] = [ "or", tail[1] ];

        const [innerHead, ...innerTail] = tail[1];
        const args = innerTail.map(evaluate);
        const value = funcsTransform[innerHead](args, $transforms[tail[0]]);
        $stored[tail[0]] = value;
        return value;
      }

      const args = tail.map(evaluate);

      return (head in funcs)
        ? funcs[head](...args)
        : node.map(evaluate);
    } else if (node.type === "symbol") {
      const name = node.value;
      return (s) => $stored[name](s);
    } else if (node.type === "token") {
      return convert(node.value);
    } else if (node.type === "literal") {
      return s => s[0] && (s[0].value === node.value)
        ? [ s[0], s.slice(1) ] 
        : null
    } else if (node.type === "lexer") {
      let val = refs[node.value.value];
      if (typeof val === "object") val = makeLexer(val);
      $lexer = val; // why is this double value
      return $lexer;
    } else if (node.type === "func") {
      return refs[node.value];
    } else { // string
      return node;
    }
  }

  const generatedParser = evaluate(ast);

  return string => {
    const generatedToks = $lexer(string);

    if (generatedToks.length === 0) {
      return [];
    }

    const gp = generatedParser.at(-1);

    // console.log({$stored, generatedToks, gp});
    const gpResult = gp(generatedToks);

    if (!Array.isArray(gpResult)) {
      console.error("The remainder is:", generatedToks);

      throw new Error("Parsing Failed.");
    }

    const [ast, remainder] = gp(generatedToks);

    if (remainder.length > 0) {
      console.error("The remainder is:", remainder);
      throw new Error("Parsing Failed.");
    }

    return ast;
  }


}




export { comb, makeLexer }




