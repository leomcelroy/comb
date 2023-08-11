maybe

enum
const
do

used

"["
"]"
"{"
"}"
"("
")"
","
"|"
"then"
"."
"if"
"else"
"for"
"in"
"fn"
"break"
"continue"
"return"
"type"
"include"
":"

possible types

  // primitive: [
  //   "string", 
  //   "boolean", 
  //   "int8",
  //   "int16",
  //   "int32",
  //   "int64",  
  //   "uint8",
  //   "uint16",
  //   "uint32",
  //   "uint64",
  //   "float8",
  //   "float16",
  //   "float32",
  //   "float64",
  //   "byte",
  //   "char",
  //   "void",
  // ],


  ```
  include "Servo.h"

const SPU = 400
const PIN_SERVO = 3

test = 1

test = ["a", "b", "c"]


type option = "c" | "d"

type optionArr = option[4]

type car = {
  door: number,
  color: string
}

fn add(x: int, y: int): int {
  for {
    if x < 10 { break }
    else { 
      x += 1 
      continue
    }
  }

  return x+y
}

for {
  if x < 10 { break }
  else { 
    x += 1 
    continue
  }
}

for {
  if x < 10 { break }
  else { 
    x += 1 
    continue
  }
}
  ```


```
include "servo.h"

SPU :int = 400
PIN_SERVO := 3

test = 1

type arr = orange[3]

type house = {
  door: "number"
}

if x < 89 {

} else {
  65
}

if x < 89 {

} else if true {
  65
}

if 78 then 67 else 56

for x in 32 {

}

5 - 9 + 7

fn add(x: number, y: number): number { }

SPU := 400
PIN_SERVO := 3

test := 1

test = ["a", "b", "c"]

type option = "c" | "d"

type optionArr = option[4]

type car = {
  door: number,
  color: string
}


fn add(x: int, y: int): int {

  for {
    if x < 10 { break }
    else { 
      x += 1 
      continue
    }
  }

  return x+y
}
```