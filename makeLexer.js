// adapted from comb.js

export const makeLexer = ({ rules, skip }) => {
  rules = rules ?? {};  
  skip = skip ?? [];

  makeRulesStart(rules);

  return string => { 
    let index = 0;

    // let line = 0;
    // let col = 0;

    const peek = () => string[index];

    const longest = (acc, cur) => cur.length >= acc.length 
      ? cur 
      : acc;

    const lexemes = [];

    while (index < string.length) {
      let mergedUnknown = false;

      let type, value;

      const matches = [];
      for (const key in rules) {
        type = key;
        value = "";
        let rule = rules[key];

        if (rule instanceof RegExp) {
          // console.log(rule);
          let tempValue = string.slice(index).match(rule);

          // if using ^ in regex don't need to check index was start
          if (tempValue !== null && tempValue.index === 0) {
            value = tempValue[0];        
          }
        } else if (Array.isArray(rule)) {
          const matches = [];
          for (let i = 0; i < rule.length; i++) {
            if (typeof rule[i] !== "string") console.error("makeLexer only accepts arrays of strings.");
            const match = string.slice(index).startsWith(rule[i]);
            if (match) matches.push(rule[i]);
          }

          value = matches.length > 0 
            ? matches.slice(1).reduce(longest, matches[0])
            : "";
        } else if (typeof rule === "string") {
          if (string.slice(index).startsWith(rule)) {
            value = rule;
          }
        }

        matches.push([ key, value ]);
      }

      // take longest match or last one
      matches.forEach(m => {
        const [ rule, matchStr ] = m;
        if (matchStr.length > value.length) {
          value = matchStr;
          type = rule;
        }
      })

      if (value === "") {
        value = string[index];
        type = "UNKNOWN";

        const lastLexeme = lexemes.at(-1);
        if (lastLexeme && lastLexeme.type === "UNKNOWN") {
          lastLexeme.value += value;
          mergedUnknown = true;
        }

      }
      
      if (!skip.includes(type) && !mergedUnknown) lexemes.push({ type, value, index });
      
      index += value.length;
    }

    return lexemes;
  }
}

function makeRulesStart(rules) {
  for (const type in rules) {
    const rule = rules[type]
    if (!(rule instanceof RegExp)) continue;
    const trimmedSlashes = rule.toString().slice(1, -1);
    if (trimmedSlashes[0] === "^") continue;
    rules[type] = new RegExp(`^${trimmedSlashes}`);
  }
}
