import { Kind as e, specifiedRules as t, NoUnusedFragmentsRule as i, ExecutableDefinitionsRule as r, KnownFragmentNamesRule as a, validate as n, LoneSchemaDefinitionRule as s, UniqueOperationTypesRule as o, UniqueTypeNamesRule as l, UniqueEnumValueNamesRule as u, UniqueFieldDefinitionNamesRule as c, UniqueDirectiveNamesRule as f, KnownTypeNamesRule as h, KnownDirectivesRule as p, UniqueDirectivesPerLocationRule as d, PossibleTypeExtensionsRule as v, UniqueArgumentNamesRule as g, UniqueInputFieldNamesRule as m, print as S, parse as y, GraphQLError as x, NoDeprecatedCustomRule as T, visit as E } from "graphql";

import { createHash as A } from "crypto";

var b;

function init(e) {
  b = e.typescript;
}

class CharacterStream {
  constructor(e) {
    this._start = 0;
    this._pos = 0;
    this.getStartOfToken = () => this._start;
    this.getCurrentPosition = () => this._pos;
    this.eol = () => this._sourceText.length === this._pos;
    this.sol = () => 0 === this._pos;
    this.peek = () => this._sourceText.charAt(this._pos) || null;
    this.next = () => {
      var e = this._sourceText.charAt(this._pos);
      this._pos++;
      return e;
    };
    this.eat = e => {
      if (this._testNextCharacter(e)) {
        this._start = this._pos;
        this._pos++;
        return this._sourceText.charAt(this._pos - 1);
      }
      return;
    };
    this.eatWhile = e => {
      var t = this._testNextCharacter(e);
      var i = !1;
      if (t) {
        i = t;
        this._start = this._pos;
      }
      while (t) {
        this._pos++;
        t = this._testNextCharacter(e);
        i = !0;
      }
      return i;
    };
    this.eatSpace = () => this.eatWhile(/[\s\u00a0]/);
    this.skipToEnd = () => {
      this._pos = this._sourceText.length;
    };
    this.skipTo = e => {
      this._pos = e;
    };
    this.match = (e, t = !0, i = !1) => {
      var r = null;
      var a = null;
      if ("string" == typeof e) {
        a = new RegExp(e, i ? "i" : "g").test(this._sourceText.slice(this._pos, this._pos + e.length));
        r = e;
      } else if (e instanceof RegExp) {
        r = null == (a = this._sourceText.slice(this._pos).match(e)) ? void 0 : a[0];
      }
      if (null != a && ("string" == typeof e || a instanceof Array && this._sourceText.startsWith(a[0], this._pos))) {
        if (t) {
          this._start = this._pos;
          if (r && r.length) {
            this._pos += r.length;
          }
        }
        return a;
      }
      return !1;
    };
    this.backUp = e => {
      this._pos -= e;
    };
    this.column = () => this._pos;
    this.indentation = () => {
      var e = this._sourceText.match(/\s*/);
      var t = 0;
      if (e && 0 !== e.length) {
        var i = e[0];
        var r = 0;
        while (i.length > r) {
          if (9 === i.charCodeAt(r)) {
            t += 2;
          } else {
            t++;
          }
          r++;
        }
      }
      return t;
    };
    this.current = () => this._sourceText.slice(this._start, this._pos);
    this._sourceText = e;
  }
  _testNextCharacter(e) {
    var t = this._sourceText.charAt(this._pos);
    var i = !1;
    if ("string" == typeof e) {
      i = t === e;
    } else {
      i = e instanceof RegExp ? e.test(t) : e(t);
    }
    return i;
  }
}

function opt(e) {
  return {
    ofRule: e
  };
}

function list(e, t) {
  return {
    ofRule: e,
    isList: !0,
    separator: t
  };
}

function t$1(e, t) {
  return {
    style: t,
    match: t => t.kind === e
  };
}

function p$1(e, t) {
  return {
    style: t || "punctuation",
    match: t => "Punctuation" === t.kind && t.value === e
  };
}

var isIgnored = e => " " === e || "\t" === e || "," === e || "\n" === e || "\r" === e || "\ufeff" === e || " " === e;

var w = {
  Name: /^[_A-Za-z][_0-9A-Za-z]*/,
  Punctuation: /^(?:!|\$|\(|\)|\.\.\.|:|=|&|@|\[|]|\{|\||\})/,
  Number: /^-?(?:0|(?:[1-9][0-9]*))(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/,
  String: /^(?:"""(?:\\"""|[^"]|"[^"]|""[^"])*(?:""")?|"(?:[^"\\]|\\(?:"|\/|\\|b|f|n|r|t|u[0-9a-fA-F]{4}))*"?)/,
  Comment: /^#.*/
};

var D = {
  Document: [ list("Definition") ],
  Definition(t) {
    switch (t.value) {
     case "{":
      return "ShortQuery";

     case "query":
      return "Query";

     case "mutation":
      return "Mutation";

     case "subscription":
      return "Subscription";

     case "fragment":
      return e.FRAGMENT_DEFINITION;

     case "schema":
      return "SchemaDef";

     case "scalar":
      return "ScalarDef";

     case "type":
      return "ObjectTypeDef";

     case "interface":
      return "InterfaceDef";

     case "union":
      return "UnionDef";

     case "enum":
      return "EnumDef";

     case "input":
      return "InputDef";

     case "extend":
      return "ExtendDef";

     case "directive":
      return "DirectiveDef";
    }
  },
  ShortQuery: [ "SelectionSet" ],
  Query: [ word("query"), opt(name$1("def")), opt("VariableDefinitions"), list("Directive"), "SelectionSet" ],
  Mutation: [ word("mutation"), opt(name$1("def")), opt("VariableDefinitions"), list("Directive"), "SelectionSet" ],
  Subscription: [ word("subscription"), opt(name$1("def")), opt("VariableDefinitions"), list("Directive"), "SelectionSet" ],
  VariableDefinitions: [ p$1("("), list("VariableDefinition"), p$1(")") ],
  VariableDefinition: [ "Variable", p$1(":"), "Type", opt("DefaultValue") ],
  Variable: [ p$1("$", "variable"), name$1("variable") ],
  DefaultValue: [ p$1("="), "Value" ],
  SelectionSet: [ p$1("{"), list("Selection"), p$1("}") ],
  Selection: (e, t) => "..." === e.value ? t.match(/[\s\u00a0,]*(on\b|@|{)/, !1) ? "InlineFragment" : "FragmentSpread" : t.match(/[\s\u00a0,]*:/, !1) ? "AliasedField" : "Field",
  AliasedField: [ name$1("property"), p$1(":"), name$1("qualifier"), opt("Arguments"), list("Directive"), opt("SelectionSet") ],
  Field: [ name$1("property"), opt("Arguments"), list("Directive"), opt("SelectionSet") ],
  Arguments: [ p$1("("), list("Argument"), p$1(")") ],
  Argument: [ name$1("attribute"), p$1(":"), "Value" ],
  FragmentSpread: [ p$1("..."), name$1("def"), list("Directive") ],
  InlineFragment: [ p$1("..."), opt("TypeCondition"), list("Directive"), "SelectionSet" ],
  FragmentDefinition: [ word("fragment"), opt(function butNot(e, t) {
    var i = e.match;
    e.match = e => {
      var r = !1;
      if (i) {
        r = i(e);
      }
      return r && t.every((t => t.match && !t.match(e)));
    };
    return e;
  }(name$1("def"), [ word("on") ])), "TypeCondition", list("Directive"), "SelectionSet" ],
  TypeCondition: [ word("on"), "NamedType" ],
  Value(e) {
    switch (e.kind) {
     case "Number":
      return "NumberValue";

     case "String":
      return "StringValue";

     case "Punctuation":
      switch (e.value) {
       case "[":
        return "ListValue";

       case "{":
        return "ObjectValue";

       case "$":
        return "Variable";

       case "&":
        return "NamedType";
      }
      return null;

     case "Name":
      switch (e.value) {
       case "true":
       case "false":
        return "BooleanValue";
      }
      if ("null" === e.value) {
        return "NullValue";
      }
      return "EnumValue";
    }
  },
  NumberValue: [ t$1("Number", "number") ],
  StringValue: [ {
    style: "string",
    match: e => "String" === e.kind,
    update(e, t) {
      if (t.value.startsWith('"""')) {
        e.inBlockstring = !t.value.slice(3).endsWith('"""');
      }
    }
  } ],
  BooleanValue: [ t$1("Name", "builtin") ],
  NullValue: [ t$1("Name", "keyword") ],
  EnumValue: [ name$1("string-2") ],
  ListValue: [ p$1("["), list("Value"), p$1("]") ],
  ObjectValue: [ p$1("{"), list("ObjectField"), p$1("}") ],
  ObjectField: [ name$1("attribute"), p$1(":"), "Value" ],
  Type: e => "[" === e.value ? "ListType" : "NonNullType",
  ListType: [ p$1("["), "Type", p$1("]"), opt(p$1("!")) ],
  NonNullType: [ "NamedType", opt(p$1("!")) ],
  NamedType: [ function type$1(e) {
    return {
      style: e,
      match: e => "Name" === e.kind,
      update(e, t) {
        var i;
        if (null === (i = e.prevState) || void 0 === i ? void 0 : i.prevState) {
          e.name = t.value;
          e.prevState.prevState.type = t.value;
        }
      }
    };
  }("atom") ],
  Directive: [ p$1("@", "meta"), name$1("meta"), opt("Arguments") ],
  DirectiveDef: [ word("directive"), p$1("@", "meta"), name$1("meta"), opt("ArgumentsDef"), word("on"), list("DirectiveLocation", p$1("|")) ],
  InterfaceDef: [ word("interface"), name$1("atom"), opt("Implements"), list("Directive"), p$1("{"), list("FieldDef"), p$1("}") ],
  Implements: [ word("implements"), list("NamedType", p$1("&")) ],
  DirectiveLocation: [ name$1("string-2") ],
  SchemaDef: [ word("schema"), list("Directive"), p$1("{"), list("OperationTypeDef"), p$1("}") ],
  OperationTypeDef: [ name$1("keyword"), p$1(":"), name$1("atom") ],
  ScalarDef: [ word("scalar"), name$1("atom"), list("Directive") ],
  ObjectTypeDef: [ word("type"), name$1("atom"), opt("Implements"), list("Directive"), p$1("{"), list("FieldDef"), p$1("}") ],
  FieldDef: [ name$1("property"), opt("ArgumentsDef"), p$1(":"), "Type", list("Directive") ],
  ArgumentsDef: [ p$1("("), list("InputValueDef"), p$1(")") ],
  InputValueDef: [ name$1("attribute"), p$1(":"), "Type", opt("DefaultValue"), list("Directive") ],
  UnionDef: [ word("union"), name$1("atom"), list("Directive"), p$1("="), list("UnionMember", p$1("|")) ],
  UnionMember: [ "NamedType" ],
  EnumDef: [ word("enum"), name$1("atom"), list("Directive"), p$1("{"), list("EnumValueDef"), p$1("}") ],
  EnumValueDef: [ name$1("string-2"), list("Directive") ],
  InputDef: [ word("input"), name$1("atom"), list("Directive"), p$1("{"), list("InputValueDef"), p$1("}") ],
  ExtendDef: [ word("extend"), "ExtensionDefinition" ],
  ExtensionDefinition(t) {
    switch (t.value) {
     case "schema":
      return e.SCHEMA_EXTENSION;

     case "scalar":
      return e.SCALAR_TYPE_EXTENSION;

     case "type":
      return e.OBJECT_TYPE_EXTENSION;

     case "interface":
      return e.INTERFACE_TYPE_EXTENSION;

     case "union":
      return e.UNION_TYPE_EXTENSION;

     case "enum":
      return e.ENUM_TYPE_EXTENSION;

     case "input":
      return e.INPUT_OBJECT_TYPE_EXTENSION;
    }
  },
  [e.SCHEMA_EXTENSION]: [ "SchemaDef" ],
  [e.SCALAR_TYPE_EXTENSION]: [ "ScalarDef" ],
  [e.OBJECT_TYPE_EXTENSION]: [ "ObjectTypeDef" ],
  [e.INTERFACE_TYPE_EXTENSION]: [ "InterfaceDef" ],
  [e.UNION_TYPE_EXTENSION]: [ "UnionDef" ],
  [e.ENUM_TYPE_EXTENSION]: [ "EnumDef" ],
  [e.INPUT_OBJECT_TYPE_EXTENSION]: [ "InputDef" ]
};

function word(e) {
  return {
    style: "keyword",
    match: t => "Name" === t.kind && t.value === e
  };
}

function name$1(e) {
  return {
    style: e,
    match: e => "Name" === e.kind,
    update(e, t) {
      e.name = t.value;
    }
  };
}

function onlineParser(t = {
  eatWhitespace: e => e.eatWhile(isIgnored),
  lexRules: w,
  parseRules: D,
  editorConfig: {}
}) {
  return {
    startState() {
      var i = {
        level: 0,
        step: 0,
        name: null,
        kind: null,
        type: null,
        rule: null,
        needsSeparator: !1,
        prevState: null
      };
      pushRule(t.parseRules, i, e.DOCUMENT);
      return i;
    },
    token: (e, i) => function getToken(e, t, i) {
      var r;
      if (t.inBlockstring) {
        if (e.match(/.*"""/)) {
          t.inBlockstring = !1;
          return "string";
        }
        e.skipToEnd();
        return "string";
      }
      var {lexRules: a, parseRules: n, eatWhitespace: s, editorConfig: o} = i;
      if (t.rule && 0 === t.rule.length) {
        popRule(t);
      } else if (t.needsAdvance) {
        t.needsAdvance = !1;
        advanceRule(t, !0);
      }
      if (e.sol()) {
        var l = (null == o ? void 0 : o.tabSize) || 2;
        t.indentLevel = Math.floor(e.indentation() / l);
      }
      if (s(e)) {
        return "ws";
      }
      var u = function lex(e, t) {
        var i = Object.keys(e);
        for (var r = 0; r < i.length; r++) {
          var a = t.match(e[i[r]]);
          if (a && a instanceof Array) {
            return {
              kind: i[r],
              value: a[0]
            };
          }
        }
      }(a, e);
      if (!u) {
        if (!e.match(/\S+/)) {
          e.match(/\s/);
        }
        pushRule(k, t, "Invalid");
        return "invalidchar";
      }
      if ("Comment" === u.kind) {
        pushRule(k, t, "Comment");
        return "comment";
      }
      var c = assign({}, t);
      if ("Punctuation" === u.kind) {
        if (/^[{([]/.test(u.value)) {
          if (void 0 !== t.indentLevel) {
            t.levels = (t.levels || []).concat(t.indentLevel + 1);
          }
        } else if (/^[})\]]/.test(u.value)) {
          var f = t.levels = (t.levels || []).slice(0, -1);
          if (t.indentLevel && f.length > 0 && f.at(-1) < t.indentLevel) {
            t.indentLevel = f.at(-1);
          }
        }
      }
      while (t.rule) {
        var h = "function" == typeof t.rule ? 0 === t.step ? t.rule(u, e) : null : t.rule[t.step];
        if (t.needsSeparator) {
          h = null == h ? void 0 : h.separator;
        }
        if (h) {
          if (h.ofRule) {
            h = h.ofRule;
          }
          if ("string" == typeof h) {
            pushRule(n, t, h);
            continue;
          }
          if (null === (r = h.match) || void 0 === r ? void 0 : r.call(h, u)) {
            if (h.update) {
              h.update(t, u);
            }
            if ("Punctuation" === u.kind) {
              advanceRule(t, !0);
            } else {
              t.needsAdvance = !0;
            }
            return h.style;
          }
        }
        unsuccessful(t);
      }
      assign(t, c);
      pushRule(k, t, "Invalid");
      return "invalidchar";
    }(e, i, t)
  };
}

function assign(e, t) {
  var i = Object.keys(t);
  for (var r = 0; r < i.length; r++) {
    e[i[r]] = t[i[r]];
  }
  return e;
}

var k = {
  Invalid: [],
  Comment: []
};

function pushRule(e, t, i) {
  if (!e[i]) {
    throw new TypeError("Unknown rule: " + i);
  }
  t.prevState = Object.assign({}, t);
  t.kind = i;
  t.name = null;
  t.type = null;
  t.rule = e[i];
  t.step = 0;
  t.needsSeparator = !1;
}

function popRule(e) {
  if (!e.prevState) {
    return;
  }
  e.kind = e.prevState.kind;
  e.name = e.prevState.name;
  e.type = e.prevState.type;
  e.rule = e.prevState.rule;
  e.step = e.prevState.step;
  e.needsSeparator = e.prevState.needsSeparator;
  e.prevState = e.prevState.prevState;
}

function advanceRule(e, t) {
  var i;
  if (isList(e) && e.rule) {
    var r = e.rule[e.step];
    if (r.separator) {
      var {separator: a} = r;
      e.needsSeparator = !e.needsSeparator;
      if (!e.needsSeparator && a.ofRule) {
        return;
      }
    }
    if (t) {
      return;
    }
  }
  e.needsSeparator = !1;
  e.step++;
  while (e.rule && !(Array.isArray(e.rule) && e.step < e.rule.length)) {
    popRule(e);
    if (e.rule) {
      if (isList(e)) {
        if (null === (i = e.rule) || void 0 === i ? void 0 : i[e.step].separator) {
          e.needsSeparator = !e.needsSeparator;
        }
      } else {
        e.needsSeparator = !1;
        e.step++;
      }
    }
  }
}

function isList(e) {
  var t = Array.isArray(e.rule) && "string" != typeof e.rule[e.step] && e.rule[e.step];
  return t && t.isList;
}

function unsuccessful(e) {
  while (e.rule && (!Array.isArray(e.rule) || !e.rule[e.step].ofRule)) {
    popRule(e);
  }
  if (e.rule) {
    advanceRule(e, !1);
  }
}

function getDefaultExportFromCjs(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}

class Range {
  constructor(e, t) {
    this.containsPosition = e => {
      if (this.start.line === e.line) {
        return this.start.character <= e.character;
      }
      if (this.end.line === e.line) {
        return this.end.character >= e.character;
      }
      return this.start.line <= e.line && this.end.line >= e.line;
    };
    this.start = e;
    this.end = t;
  }
  setStart(e, t) {
    this.start = new Position(e, t);
  }
  setEnd(e, t) {
    this.end = new Position(e, t);
  }
}

class Position {
  constructor(e, t) {
    this.lessThanOrEqualTo = e => this.line < e.line || this.line === e.line && this.character <= e.character;
    this.line = e;
    this.character = t;
  }
  setLine(e) {
    this.line = e;
  }
  setCharacter(e) {
    this.character = e;
  }
}

var C = [ s, o, l, u, c, f, h, p, d, v, g, m ];

var F = {
  ["Error"]: 1,
  ["Warning"]: 2,
  ["Information"]: 3,
  ["Hint"]: 4
};

var invariant = (e, t) => {
  if (!e) {
    throw new Error(t);
  }
};

function getDiagnostics(s, o = null, l, u, c) {
  var f, h;
  var p = null;
  var d = "";
  if (c) {
    d = "string" == typeof c ? c : c.reduce(((e, t) => e + S(t) + "\n\n"), "");
  }
  var v = d ? `${s}\n\n${d}` : s;
  try {
    p = y(v);
  } catch (e) {
    if (e instanceof x) {
      var g = function getRange(e, t) {
        var i = onlineParser();
        var r = i.startState();
        var a = t.split("\n");
        invariant(a.length >= e.line, "Query text must have more lines than where the error happened");
        var n = null;
        for (var s = 0; s < e.line; s++) {
          n = new CharacterStream(a[s]);
          while (!n.eol()) {
            if ("invalidchar" === i.token(n, r)) {
              break;
            }
          }
        }
        invariant(n, "Expected Parser stream to be available.");
        var o = e.line - 1;
        var l = n.getStartOfToken();
        var u = n.getCurrentPosition();
        return new Range(new Position(o, l), new Position(o, u));
      }(null !== (h = null === (f = e.locations) || void 0 === f ? void 0 : f[0]) && void 0 !== h ? h : {
        line: 0,
        column: 0
      }, v);
      return [ {
        severity: F.Error,
        message: e.message,
        source: "GraphQL: Syntax",
        range: g
      } ];
    }
    throw e;
  }
  return function validateQuery(s, o = null, l, u) {
    if (!o) {
      return [];
    }
    var c = function validateWithCustomRules(s, o, l, u, c) {
      var f = t.filter((e => {
        if (e === i || e === r) {
          return !1;
        }
        if (u && e === a) {
          return !1;
        }
        return !0;
      }));
      if (l) {
        Array.prototype.push.apply(f, l);
      }
      if (c) {
        Array.prototype.push.apply(f, C);
      }
      return n(s, o, f).filter((t => {
        if (t.message.includes("Unknown directive") && t.nodes) {
          var i = t.nodes[0];
          if (i && i.kind === e.DIRECTIVE) {
            var r = i.name.value;
            if ("arguments" === r || "argumentDefinitions" === r) {
              return !1;
            }
          }
        }
        return !0;
      }));
    }(o, s, l, u).flatMap((e => annotations(e, F.Error, "Validation")));
    var f = n(o, s, [ T ]).flatMap((e => annotations(e, F.Warning, "Deprecation")));
    return c.concat(f);
  }(p, o, l, u);
}

function annotations(e, t, i) {
  if (!e.nodes) {
    return [];
  }
  var r = [];
  for (var [a, n] of e.nodes.entries()) {
    var s = "Variable" !== n.kind && "name" in n && void 0 !== n.name ? n.name : "variable" in n && void 0 !== n.variable ? n.variable : n;
    if (s) {
      invariant(e.locations, "GraphQL validation error requires locations.");
      var o = e.locations[a];
      var l = getLocation(s);
      var u = o.column + (l.end - l.start);
      r.push({
        source: `GraphQL: ${i}`,
        message: e.message,
        severity: t,
        range: new Range(new Position(o.line - 1, o.column - 1), new Position(o.line - 1, u))
      });
    }
  }
  return r;
}

function getLocation(e) {
  var t = e.loc;
  invariant(t, "Expected ASTNode to have a location.");
  return t;
}

var L = "FragmentDefinition";

class GraphQLError extends Error {
  constructor(e, t, i, r, a, n, s) {
    super(e);
    this.name = "GraphQLError";
    this.message = e;
    if (a) {
      this.path = a;
    }
    if (t) {
      this.nodes = Array.isArray(t) ? t : [ t ];
    }
    if (i) {
      this.source = i;
    }
    if (r) {
      this.positions = r;
    }
    if (n) {
      this.originalError = n;
    }
    var o = s;
    if (!o && n) {
      var l = n.extensions;
      if (l && "object" == typeof l) {
        o = l;
      }
    }
    this.extensions = o || {};
  }
  toJSON() {
    return {
      ...this,
      message: this.message
    };
  }
  toString() {
    return this.message;
  }
  get [Symbol.toStringTag]() {
    return "GraphQLError";
  }
}

var _;

var N;

function error(e) {
  return new GraphQLError(`Syntax Error: Unexpected token at ${N} in ${e}`);
}

function advance(e) {
  e.lastIndex = N;
  if (e.test(_)) {
    return _.slice(N, N = e.lastIndex);
  }
}

var O = / +(?=[^\s])/y;

function blockString(e) {
  var t = e.split("\n");
  var i = "";
  var r = 0;
  var a = 0;
  var n = t.length - 1;
  for (var s = 0; s < t.length; s++) {
    O.lastIndex = 0;
    if (O.test(t[s])) {
      if (s && (!r || O.lastIndex < r)) {
        r = O.lastIndex;
      }
      a = a || s;
      n = s;
    }
  }
  for (var o = a; o <= n; o++) {
    if (o !== a) {
      i += "\n";
    }
    i += t[o].slice(r).replace(/\\"""/g, '"""');
  }
  return i;
}

function ignored() {
  for (var e = 0 | _.charCodeAt(N++); 9 === e || 10 === e || 13 === e || 32 === e || 35 === e || 44 === e || 65279 === e; e = 0 | _.charCodeAt(N++)) {
    if (35 === e) {
      while (10 !== (e = _.charCodeAt(N++)) && 13 !== e) {}
    }
  }
  N--;
}

var I = /[_A-Za-z]\w*/y;

function name() {
  var e;
  if (e = advance(I)) {
    return {
      kind: "Name",
      value: e
    };
  }
}

var z = /(?:null|true|false)/y;

var P = /\$[_A-Za-z]\w*/y;

var $ = /-?\d+/y;

var V = /(?:\.\d+)?[eE][+-]?\d+|\.\d+/y;

var R = /\\/g;

var j = /"""(?:"""|(?:[\s\S]*?[^\\])""")/y;

var B = /"(?:"|[^\r\n]*?[^\\]")/y;

function value(e) {
  var t;
  var i;
  if (i = advance(z)) {
    t = "null" === i ? {
      kind: "NullValue"
    } : {
      kind: "BooleanValue",
      value: "true" === i
    };
  } else if (!e && (i = advance(P))) {
    t = {
      kind: "Variable",
      name: {
        kind: "Name",
        value: i.slice(1)
      }
    };
  } else if (i = advance($)) {
    var r = i;
    if (i = advance(V)) {
      t = {
        kind: "FloatValue",
        value: r + i
      };
    } else {
      t = {
        kind: "IntValue",
        value: r
      };
    }
  } else if (i = advance(I)) {
    t = {
      kind: "EnumValue",
      value: i
    };
  } else if (i = advance(j)) {
    t = {
      kind: "StringValue",
      value: blockString(i.slice(3, -3)),
      block: !0
    };
  } else if (i = advance(B)) {
    t = {
      kind: "StringValue",
      value: R.test(i) ? JSON.parse(i) : i.slice(1, -1),
      block: !1
    };
  } else if (t = function list(e) {
    var t;
    if (91 === _.charCodeAt(N)) {
      N++;
      ignored();
      var i = [];
      while (t = value(e)) {
        i.push(t);
      }
      if (93 !== _.charCodeAt(N++)) {
        throw error("ListValue");
      }
      ignored();
      return {
        kind: "ListValue",
        values: i
      };
    }
  }(e) || function object(e) {
    if (123 === _.charCodeAt(N)) {
      N++;
      ignored();
      var t = [];
      var i;
      while (i = name()) {
        ignored();
        if (58 !== _.charCodeAt(N++)) {
          throw error("ObjectField");
        }
        ignored();
        var r = value(e);
        if (!r) {
          throw error("ObjectField");
        }
        t.push({
          kind: "ObjectField",
          name: i,
          value: r
        });
      }
      if (125 !== _.charCodeAt(N++)) {
        throw error("ObjectValue");
      }
      ignored();
      return {
        kind: "ObjectValue",
        fields: t
      };
    }
  }(e)) {
    return t;
  }
  ignored();
  return t;
}

function arguments_(e) {
  var t = [];
  ignored();
  if (40 === _.charCodeAt(N)) {
    N++;
    ignored();
    var i;
    while (i = name()) {
      ignored();
      if (58 !== _.charCodeAt(N++)) {
        throw error("Argument");
      }
      ignored();
      var r = value(e);
      if (!r) {
        throw error("Argument");
      }
      t.push({
        kind: "Argument",
        name: i,
        value: r
      });
    }
    if (!t.length || 41 !== _.charCodeAt(N++)) {
      throw error("Argument");
    }
    ignored();
  }
  return t;
}

function directives(e) {
  var t = [];
  ignored();
  while (64 === _.charCodeAt(N)) {
    N++;
    var i = name();
    if (!i) {
      throw error("Directive");
    }
    ignored();
    t.push({
      kind: "Directive",
      name: i,
      arguments: arguments_(e)
    });
  }
  return t;
}

function field() {
  var e = name();
  if (e) {
    ignored();
    var t;
    if (58 === _.charCodeAt(N)) {
      N++;
      ignored();
      t = e;
      if (!(e = name())) {
        throw error("Field");
      }
      ignored();
    }
    return {
      kind: "Field",
      alias: t,
      name: e,
      arguments: arguments_(!1),
      directives: directives(!1),
      selectionSet: selectionSet()
    };
  }
}

function type() {
  var e;
  ignored();
  if (91 === _.charCodeAt(N)) {
    N++;
    ignored();
    var t = type();
    if (!t || 93 !== _.charCodeAt(N++)) {
      throw error("ListType");
    }
    e = {
      kind: "ListType",
      type: t
    };
  } else if (e = name()) {
    e = {
      kind: "NamedType",
      name: e
    };
  } else {
    throw error("NamedType");
  }
  ignored();
  if (33 === _.charCodeAt(N)) {
    N++;
    ignored();
    return {
      kind: "NonNullType",
      type: e
    };
  } else {
    return e;
  }
}

var M = /on/y;

function typeCondition() {
  if (advance(M)) {
    ignored();
    var e = name();
    if (!e) {
      throw error("NamedType");
    }
    ignored();
    return {
      kind: "NamedType",
      name: e
    };
  }
}

var W = /\.\.\./y;

function fragmentSpread() {
  if (advance(W)) {
    ignored();
    var e = N;
    var t;
    if ((t = name()) && "on" !== t.value) {
      return {
        kind: "FragmentSpread",
        name: t,
        directives: directives(!1)
      };
    } else {
      N = e;
      var i = typeCondition();
      var r = directives(!1);
      var a = selectionSet();
      if (!a) {
        throw error("InlineFragment");
      }
      return {
        kind: "InlineFragment",
        typeCondition: i,
        directives: r,
        selectionSet: a
      };
    }
  }
}

function selectionSet() {
  var e;
  ignored();
  if (123 === _.charCodeAt(N)) {
    N++;
    ignored();
    var t = [];
    while (e = fragmentSpread() || field()) {
      t.push(e);
    }
    if (!t.length || 125 !== _.charCodeAt(N++)) {
      throw error("SelectionSet");
    }
    ignored();
    return {
      kind: "SelectionSet",
      selections: t
    };
  }
}

var U = /fragment/y;

function fragmentDefinition() {
  if (advance(U)) {
    ignored();
    var e = name();
    if (!e) {
      throw error("FragmentDefinition");
    }
    ignored();
    var t = typeCondition();
    if (!t) {
      throw error("FragmentDefinition");
    }
    var i = directives(!1);
    var r = selectionSet();
    if (!r) {
      throw error("FragmentDefinition");
    }
    return {
      kind: "FragmentDefinition",
      name: e,
      typeCondition: t,
      directives: i,
      selectionSet: r
    };
  }
}

var K = /(?:query|mutation|subscription)/y;

function operationDefinition() {
  var e;
  var t;
  var i = [];
  var r = [];
  if (e = advance(K)) {
    ignored();
    t = name();
    i = function variableDefinitions() {
      var e;
      var t = [];
      ignored();
      if (40 === _.charCodeAt(N)) {
        N++;
        ignored();
        while (e = advance(P)) {
          ignored();
          if (58 !== _.charCodeAt(N++)) {
            throw error("VariableDefinition");
          }
          var i = type();
          var r = void 0;
          if (61 === _.charCodeAt(N)) {
            N++;
            ignored();
            if (!(r = value(!0))) {
              throw error("VariableDefinition");
            }
          }
          ignored();
          t.push({
            kind: "VariableDefinition",
            variable: {
              kind: "Variable",
              name: {
                kind: "Name",
                value: e.slice(1)
              }
            },
            type: i,
            defaultValue: r,
            directives: directives(!0)
          });
        }
        if (41 !== _.charCodeAt(N++)) {
          throw error("VariableDefinition");
        }
        ignored();
      }
      return t;
    }();
    r = directives(!1);
  }
  var a = selectionSet();
  if (a) {
    return {
      kind: "OperationDefinition",
      operation: e || "query",
      name: t,
      variableDefinitions: i,
      directives: r,
      selectionSet: a
    };
  }
}

function parse(e, t) {
  _ = "string" == typeof e.body ? e.body : e;
  N = 0;
  return function document() {
    var e;
    ignored();
    var t = [];
    while (e = fragmentDefinition() || operationDefinition()) {
      t.push(e);
    }
    return {
      kind: "Document",
      definitions: t
    };
  }();
}

var G = {};

function visit(e, t) {
  var i = [];
  var r = [];
  try {
    var a = function traverse(e, a, n) {
      var s = !1;
      var o = t[e.kind] && t[e.kind].enter || t[e.kind] || t.enter;
      var l = o && o.call(t, e, a, n, r, i);
      if (!1 === l) {
        return e;
      } else if (null === l) {
        return null;
      } else if (l === G) {
        throw G;
      } else if (l && "string" == typeof l.kind) {
        s = l !== e;
        e = l;
      }
      if (n) {
        i.push(n);
      }
      var u;
      var c = {
        ...e
      };
      for (var f in e) {
        r.push(f);
        var h = e[f];
        if (Array.isArray(h)) {
          var p = [];
          for (var d = 0; d < h.length; d++) {
            if (null != h[d] && "string" == typeof h[d].kind) {
              i.push(e);
              r.push(d);
              u = traverse(h[d], d, h);
              r.pop();
              i.pop();
              if (null == u) {
                s = !0;
              } else {
                s = s || u !== h[d];
                p.push(u);
              }
            }
          }
          h = p;
        } else if (null != h && "string" == typeof h.kind) {
          if (void 0 !== (u = traverse(h, f, e))) {
            s = s || h !== u;
            h = u;
          }
        }
        r.pop();
        if (s) {
          c[f] = h;
        }
      }
      if (n) {
        i.pop();
      }
      var v = t[e.kind] && t[e.kind].leave || t.leave;
      var g = v && v.call(t, e, a, n, r, i);
      if (g === G) {
        throw G;
      } else if (void 0 !== g) {
        return g;
      } else if (void 0 !== l) {
        return s ? c : l;
      } else {
        return s ? c : e;
      }
    }(e);
    return void 0 !== a && !1 !== a ? a : e;
  } catch (t) {
    if (t !== G) {
      throw t;
    }
    return e;
  }
}

var hasItems = e => !(!e || !e.length);

var Q = {
  OperationDefinition(e) {
    if ("query" === e.operation && !e.name && !hasItems(e.variableDefinitions) && !hasItems(e.directives)) {
      return Q.SelectionSet(e.selectionSet);
    }
    var t = e.operation;
    if (e.name) {
      t += " " + e.name.value;
    }
    if (hasItems(e.variableDefinitions)) {
      if (!e.name) {
        t += " ";
      }
      t += "(" + e.variableDefinitions.map(Q.VariableDefinition).join(", ") + ")";
    }
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return t + " " + Q.SelectionSet(e.selectionSet);
  },
  VariableDefinition(e) {
    var t = Q.Variable(e.variable) + ": " + print(e.type);
    if (e.defaultValue) {
      t += " = " + print(e.defaultValue);
    }
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return t;
  },
  Field(e) {
    var t = (e.alias ? e.alias.value + ": " : "") + e.name.value;
    if (hasItems(e.arguments)) {
      var i = e.arguments.map(Q.Argument);
      var r = t + "(" + i.join(", ") + ")";
      t = r.length > 80 ? t + "(\n  " + i.join("\n").replace(/\n/g, "\n  ") + "\n)" : r;
    }
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return e.selectionSet ? t + " " + Q.SelectionSet(e.selectionSet) : t;
  },
  StringValue: e => e.block ? function printBlockString(e) {
    return '"""\n' + e.replace(/"""/g, '\\"""') + '\n"""';
  }(e.value) : function printString(e) {
    return JSON.stringify(e);
  }(e.value),
  BooleanValue: e => "" + e.value,
  NullValue: e => "null",
  IntValue: e => e.value,
  FloatValue: e => e.value,
  EnumValue: e => e.value,
  Name: e => e.value,
  Variable: e => "$" + e.name.value,
  ListValue: e => "[" + e.values.map(print).join(", ") + "]",
  ObjectValue: e => "{" + e.fields.map(Q.ObjectField).join(", ") + "}",
  ObjectField: e => e.name.value + ": " + print(e.value),
  Document: e => hasItems(e.definitions) ? e.definitions.map(print).join("\n\n") : "",
  SelectionSet: e => "{\n  " + e.selections.map(print).join("\n").replace(/\n/g, "\n  ") + "\n}",
  Argument: e => e.name.value + ": " + print(e.value),
  FragmentSpread(e) {
    var t = "..." + e.name.value;
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return t;
  },
  InlineFragment(e) {
    var t = "...";
    if (e.typeCondition) {
      t += " on " + e.typeCondition.name.value;
    }
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return t + " " + print(e.selectionSet);
  },
  FragmentDefinition(e) {
    var t = "fragment " + e.name.value;
    t += " on " + e.typeCondition.name.value;
    if (hasItems(e.directives)) {
      t += " " + e.directives.map(Q.Directive).join(" ");
    }
    return t + " " + print(e.selectionSet);
  },
  Directive(e) {
    var t = "@" + e.name.value;
    if (hasItems(e.arguments)) {
      t += "(" + e.arguments.map(Q.Argument).join(", ") + ")";
    }
    return t;
  },
  NamedType: e => e.name.value,
  ListType: e => "[" + print(e.type) + "]",
  NonNullType: e => print(e.type) + "!"
};

function print(e) {
  return Q[e.kind] ? Q[e.kind](e) : "";
}

var q = new Set([ "gql", "graphql" ]);

var isIIFE = e => b.isCallExpression(e) && 0 === e.arguments.length && (b.isFunctionExpression(e.expression) || b.isArrowFunction(e.expression)) && !e.expression.asteriskToken && !e.expression.modifiers?.length;

var isGraphQLFunctionIdentifier = e => b.isIdentifier(e) && q.has(e.escapedText);

var isTadaGraphQLFunction = (e, t) => {
  if (!b.isLeftHandSideExpression(e)) {
    return !1;
  }
  var i = t?.getTypeAtLocation(e);
  return null != i && null != i.getProperty("scalar") && null != i.getProperty("persisted");
};

var isTadaGraphQLCall = (e, t) => {
  if (!b.isCallExpression(e)) {
    return !1;
  } else if (e.arguments.length < 1 || e.arguments.length > 2) {
    return !1;
  } else if (!b.isStringLiteralLike(e.arguments[0])) {
    return !1;
  }
  return t ? isTadaGraphQLFunction(e.expression, t) : !1;
};

var isTadaPersistedCall = (e, t) => {
  if (!e) {
    return !1;
  } else if (!b.isCallExpression(e)) {
    return !1;
  } else if (!b.isPropertyAccessExpression(e.expression)) {
    return !1;
  } else if (!b.isIdentifier(e.expression.name) || "persisted" !== e.expression.name.escapedText) {
    return !1;
  } else if (isGraphQLFunctionIdentifier(e.expression.expression)) {
    return !0;
  } else {
    return isTadaGraphQLFunction(e.expression.expression, t);
  }
};

var isGraphQLCall = (e, t) => b.isCallExpression(e) && e.arguments.length >= 1 && e.arguments.length <= 2 && (isGraphQLFunctionIdentifier(e.expression) || isTadaGraphQLCall(e, t));

var isGraphQLTag = e => b.isTaggedTemplateExpression(e) && isGraphQLFunctionIdentifier(e.tag);

var getSchemaName = (e, t, i = !1) => {
  if (!t) {
    return null;
  }
  var r = t.getTypeAtLocation(i ? e.getChildAt(0).getChildAt(0) : e.expression);
  if (r) {
    var a = r.getProperty("__name");
    if (a) {
      var n = t.getTypeOfSymbol(a);
      if (n.isUnionOrIntersection()) {
        var s = n.types.find((e => e.isStringLiteral()));
        return s && s.isStringLiteral() ? s.value : null;
      } else if (n.isStringLiteral()) {
        return n.value;
      }
    }
  }
  return null;
};

function isValueDeclaration(e) {
  switch (e.kind) {
   case b.SyntaxKind.BinaryExpression:
   case b.SyntaxKind.ArrowFunction:
   case b.SyntaxKind.BindingElement:
   case b.SyntaxKind.ClassDeclaration:
   case b.SyntaxKind.ClassExpression:
   case b.SyntaxKind.ClassStaticBlockDeclaration:
   case b.SyntaxKind.Constructor:
   case b.SyntaxKind.EnumDeclaration:
   case b.SyntaxKind.EnumMember:
   case b.SyntaxKind.ExportAssignment:
   case b.SyntaxKind.FunctionDeclaration:
   case b.SyntaxKind.FunctionExpression:
   case b.SyntaxKind.GetAccessor:
   case b.SyntaxKind.JsxAttribute:
   case b.SyntaxKind.MethodDeclaration:
   case b.SyntaxKind.Parameter:
   case b.SyntaxKind.PropertyAssignment:
   case b.SyntaxKind.PropertyDeclaration:
   case b.SyntaxKind.SetAccessor:
   case b.SyntaxKind.ShorthandPropertyAssignment:
   case b.SyntaxKind.VariableDeclaration:
    return !0;

   default:
    return !1;
  }
}

function getValueOfValueDeclaration(e) {
  switch (e.kind) {
   case b.SyntaxKind.ClassExpression:
   case b.SyntaxKind.ClassDeclaration:
   case b.SyntaxKind.ArrowFunction:
   case b.SyntaxKind.ClassStaticBlockDeclaration:
   case b.SyntaxKind.Constructor:
   case b.SyntaxKind.EnumDeclaration:
   case b.SyntaxKind.FunctionDeclaration:
   case b.SyntaxKind.FunctionExpression:
   case b.SyntaxKind.GetAccessor:
   case b.SyntaxKind.SetAccessor:
   case b.SyntaxKind.MethodDeclaration:
    return e;

   case b.SyntaxKind.BindingElement:
   case b.SyntaxKind.EnumMember:
   case b.SyntaxKind.JsxAttribute:
   case b.SyntaxKind.Parameter:
   case b.SyntaxKind.PropertyAssignment:
   case b.SyntaxKind.PropertyDeclaration:
   case b.SyntaxKind.VariableDeclaration:
    return e.initializer;

   case b.SyntaxKind.ExportAssignment:
    return e.expression;

   case b.SyntaxKind.BinaryExpression:
    return function isAssignmentOperator(e) {
      switch (e.kind) {
       case b.SyntaxKind.EqualsToken:
       case b.SyntaxKind.BarBarEqualsToken:
       case b.SyntaxKind.AmpersandAmpersandEqualsToken:
       case b.SyntaxKind.QuestionQuestionEqualsToken:
        return !0;

       default:
        return !1;
      }
    }(e.operatorToken) ? e.right : void 0;

   case b.SyntaxKind.ShorthandPropertyAssignment:
    return e.objectAssignmentInitializer;

   default:
    return;
  }
}

function climbPastPropertyOrElementAccess(e) {
  if (e.parent && b.isPropertyAccessExpression(e.parent) && e.parent.name === e) {
    return e.parent;
  } else if (e.parent && b.isElementAccessExpression(e.parent) && e.parent.argumentExpression === e) {
    return e.parent;
  } else {
    return e;
  }
}

function getNameFromPropertyName(e) {
  if (b.isComputedPropertyName(e)) {
    return b.isStringLiteralLike(e.expression) || b.isNumericLiteral(e.expression) ? e.expression.text : void 0;
  } else if (b.isPrivateIdentifier(e) || b.isMemberName(e)) {
    return b.idText(e);
  } else {
    return e.text;
  }
}

function getDeclarationOfIdentifier(e, t) {
  var i = t.getSymbolAtLocation(e);
  if (i?.declarations?.[0] && i.flags & b.SymbolFlags.Alias && (e.parent === i?.declarations?.[0] || !b.isNamespaceImport(i.declarations[0]))) {
    var r = t.getAliasedSymbol(i);
    if (r.declarations) {
      i = r;
    }
  }
  if (i && b.isShorthandPropertyAssignment(e.parent)) {
    var a = t.getShorthandAssignmentValueSymbol(i.valueDeclaration);
    if (a) {
      i = a;
    }
  } else if (b.isBindingElement(e.parent) && b.isObjectBindingPattern(e.parent.parent) && e === (e.parent.propertyName || e.parent.name)) {
    var n = getNameFromPropertyName(e);
    var s = n ? t.getTypeAtLocation(e.parent.parent).getProperty(n) : void 0;
    if (s) {
      i = s;
    }
  } else if (b.isObjectLiteralElement(e.parent) && (b.isObjectLiteralExpression(e.parent.parent) || b.isJsxAttributes(e.parent.parent)) && e.parent.name === e) {
    var o = getNameFromPropertyName(e);
    var l = o ? t.getContextualType(e.parent.parent)?.getProperty(o) : void 0;
    if (l) {
      i = l;
    }
  }
  if (i && i.declarations?.length) {
    if (i.flags & b.SymbolFlags.Class && !(i.flags & (b.SymbolFlags.Function | b.SymbolFlags.Variable)) && function isNewExpressionTarget(e) {
      var t = climbPastPropertyOrElementAccess(e).parent;
      return b.isNewExpression(t) && t.expression === e;
    }(e)) {
      for (var u of i.declarations) {
        if (b.isClassLike(u)) {
          return u;
        }
      }
    } else if (function isCallOrNewExpressionTarget(e) {
      var t = climbPastPropertyOrElementAccess(e).parent;
      return b.isCallOrNewExpression(t) && t.expression === e;
    }(e) || function isNameOfFunctionDeclaration(e) {
      return b.isIdentifier(e) && e.parent && b.isFunctionLike(e.parent) && e.parent.name === e;
    }(e)) {
      for (var c of i.declarations) {
        if (b.isFunctionLike(c) && c.body && isValueDeclaration(c)) {
          return c;
        }
      }
    }
    if (i.valueDeclaration && b.isPropertyAccessExpression(i.valueDeclaration)) {
      var f = i.valueDeclaration.parent;
      if (f && b.isBinaryExpression(f) && f.left === i.valueDeclaration) {
        return f;
      }
    }
    if (i.valueDeclaration && isValueDeclaration(i.valueDeclaration)) {
      return i.valueDeclaration;
    }
    for (var h of i.declarations) {
      if (isValueDeclaration(h)) {
        return h;
      }
    }
  }
  return;
}

function getValueOfIdentifier(e, t) {
  while (b.isIdentifier(e)) {
    var i = getDeclarationOfIdentifier(e, t);
    if (!i) {
      return;
    } else {
      var r = getValueOfValueDeclaration(i);
      if (r && b.isIdentifier(r) && r !== e) {
        e = r;
      } else {
        return r;
      }
    }
  }
}

function resolveTemplate(e, t, i) {
  if (b.isStringLiteralLike(e)) {
    return {
      combinedText: e.getText().slice(1, -1),
      resolvedSpans: []
    };
  }
  var r = e.template.getText().slice(1, -1);
  if (b.isNoSubstitutionTemplateLiteral(e.template) || 0 === e.template.templateSpans.length) {
    return {
      combinedText: r,
      resolvedSpans: []
    };
  }
  var a = 0;
  var n = e.template.templateSpans.map((e => {
    if (b.isIdentifier(e.expression)) {
      var t = i.languageService.getProgram()?.getTypeChecker();
      if (!t) {
        return;
      }
      var n = getDeclarationOfIdentifier(e.expression, t);
      if (!n) {
        return;
      }
      var s = n;
      if (b.isVariableDeclaration(s)) {
        var o = e.expression.escapedText;
        var l = getValueOfValueDeclaration(s);
        if (!l) {
          return;
        }
        var u = e.expression.getStart() - 2;
        var c = {
          start: u,
          length: e.expression.end - u + 1
        };
        if (b.isTaggedTemplateExpression(l)) {
          var f = resolveTemplate(l, s.getSourceFile().fileName, i);
          r = r.replace("${" + e.expression.escapedText + "}", f.combinedText);
          var h = {
            lines: f.combinedText.split("\n").length,
            identifier: o,
            original: c,
            new: {
              start: c.start + a,
              length: f.combinedText.length
            }
          };
          a += f.combinedText.length - c.length;
          return h;
        } else if (b.isAsExpression(l) && b.isTaggedTemplateExpression(l.expression)) {
          var p = resolveTemplate(l.expression, s.getSourceFile().fileName, i);
          r = r.replace("${" + e.expression.escapedText + "}", p.combinedText);
          var d = {
            lines: p.combinedText.split("\n").length,
            identifier: o,
            original: c,
            new: {
              start: c.start + a,
              length: p.combinedText.length
            }
          };
          a += p.combinedText.length - c.length;
          return d;
        } else if (b.isAsExpression(l) && b.isAsExpression(l.expression) && b.isObjectLiteralExpression(l.expression.expression)) {
          var v = print(JSON.parse(l.expression.expression.getText()));
          r = r.replace("${" + e.expression.escapedText + "}", v);
          var g = {
            lines: v.split("\n").length,
            identifier: o,
            original: c,
            new: {
              start: c.start + a,
              length: v.length
            }
          };
          a += v.length - c.length;
          return g;
        }
        return;
      }
    }
    return;
  })).filter(Boolean);
  return {
    combinedText: r,
    resolvedSpans: n
  };
}

var resolveTadaFragmentArray = e => {
  if (!e) {
    return;
  }
  while (b.isAsExpression(e)) {
    e = e.expression;
  }
  if (!b.isArrayLiteralExpression(e)) {
    return;
  }
  if (e.elements.every(b.isIdentifier)) {
    return e.elements;
  }
  var t = [];
  for (var i of e.elements) {
    while (b.isPropertyAccessExpression(i)) {
      i = i.name;
    }
    if (b.isIdentifier(i)) {
      t.push(i);
    }
  }
  return t;
};

function getSource(e, t) {
  var i = e.languageService.getProgram();
  if (!i) {
    return;
  }
  var r = i.getSourceFile(t);
  if (!r) {
    return;
  }
  return r;
}

function findNode(e, t) {
  return function find(e) {
    if (t >= e.getStart() && t < e.getEnd()) {
      return b.forEachChild(e, find) || e;
    }
  }(e);
}

function unrollFragment(e, t, i) {
  var r = [];
  var a = [ e ];
  var n = new WeakSet;
  var _unrollElement = e => {
    if (n.has(e)) {
      return;
    }
    n.add(e);
    var t = function resolveIdentifierToGraphQLCall(e, t, i) {
      if (!i) {
        return null;
      }
      var r = getValueOfIdentifier(e, i);
      if (!r) {
        return null;
      }
      return isGraphQLCall(r, i) ? r : null;
    }(e, 0, i);
    if (!t) {
      return;
    }
    var s = resolveTadaFragmentArray(t.arguments[1]);
    if (s) {
      a.push(...s);
    }
    try {
      y(t.arguments[0].getText().slice(1, -1), {
        noLocation: !0
      }).definitions.forEach((e => {
        if ("FragmentDefinition" === e.kind) {
          r.push(e);
        }
      }));
    } catch (e) {}
  };
  var s;
  while (void 0 !== (s = a.shift())) {
    _unrollElement(s);
  }
  return r;
}

function unrollTadaFragments(e, t, i) {
  var r = i.languageService.getProgram()?.getTypeChecker();
  e.elements.forEach((e => {
    if (b.isIdentifier(e)) {
      t.push(...unrollFragment(e, 0, r));
    } else if (b.isPropertyAccessExpression(e)) {
      var i = e;
      while (b.isPropertyAccessExpression(i.expression)) {
        i = i.expression;
      }
      if (b.isIdentifier(i.name)) {
        t.push(...unrollFragment(i.name, 0, r));
      }
    }
  }));
  return t;
}

function findAllCallExpressions(e, t, i = !0) {
  var r = t.languageService.getProgram()?.getTypeChecker();
  var a = [];
  var n = [];
  var s = i ? !1 : !0;
  !function find(i) {
    if (!b.isCallExpression(i) || isIIFE(i)) {
      return b.forEachChild(i, find);
    }
    if (!isGraphQLCall(i, r)) {
      return b.forEachChild(i, find);
    }
    var o = getSchemaName(i, r);
    var l = i.arguments[0];
    var u = resolveTadaFragmentArray(i.arguments[1]);
    if (!s && !u) {
      s = !0;
      n.push(...getAllFragments(e.fileName, i, t));
    } else if (u) {
      for (var c of u) {
        n.push(...unrollFragment(c, 0, r));
      }
    }
    if (l && b.isStringLiteralLike(l)) {
      a.push({
        node: l,
        schema: o
      });
    }
  }(e);
  return {
    nodes: a,
    fragments: n
  };
}

function findAllPersistedCallExpressions(e, t) {
  var i = [];
  var r = t?.languageService.getProgram()?.getTypeChecker();
  !function find(e) {
    if (!b.isCallExpression(e) || isIIFE(e)) {
      return b.forEachChild(e, find);
    }
    if (!isTadaPersistedCall(e, r)) {
      return;
    } else if (t) {
      var a = getSchemaName(e, r, !0);
      i.push({
        node: e,
        schema: a
      });
    } else {
      i.push(e);
    }
  }(e);
  return i;
}

function getAllFragments(e, t, i) {
  var r = [];
  var a = i.languageService.getProgram()?.getTypeChecker();
  if (!b.isCallExpression(t)) {
    return r;
  }
  var n = resolveTadaFragmentArray(t.arguments[1]);
  if (n) {
    var s = i.languageService.getProgram()?.getTypeChecker();
    for (var o of n) {
      r.push(...unrollFragment(o, 0, s));
    }
    return r;
  } else if (isTadaGraphQLCall(t, a)) {
    return r;
  }
  if (!a) {
    return r;
  }
  var l = function getIdentifierOfChainExpression(e) {
    var t = e;
    while (t) {
      if (b.isPropertyAccessExpression(t)) {
        t = t.name;
      } else if (b.isAsExpression(t) || b.isSatisfiesExpression(t) || b.isNonNullExpression(t) || b.isParenthesizedExpression(t) || b.isExpressionWithTypeArguments(t)) {
        t = t.expression;
      } else if (b.isCommaListExpression(t)) {
        t = t.elements[t.elements.length - 1];
      } else if (b.isIdentifier(t)) {
        return t;
      } else {
        return;
      }
    }
  }(t.expression);
  if (!l) {
    return r;
  }
  var u = getDeclarationOfIdentifier(l, a);
  if (!u) {
    return r;
  }
  var c = u.getSourceFile();
  if (!c) {
    return r;
  }
  var f = [ {
    fileName: c.fileName,
    textSpan: {
      start: u.getStart(),
      length: u.getWidth()
    }
  } ];
  if (!f || !f.length) {
    return r;
  }
  var h = f[0];
  if (!h) {
    return r;
  }
  var p = getSource(i, h.fileName);
  if (!p) {
    return r;
  }
  b.forEachChild(p, (e => {
    if (b.isVariableStatement(e) && e.declarationList && e.declarationList.declarations[0] && "documents" === e.declarationList.declarations[0].name.getText()) {
      var [t] = e.declarationList.declarations;
      if (t.initializer && b.isObjectLiteralExpression(t.initializer)) {
        t.initializer.properties.forEach((e => {
          if (b.isPropertyAssignment(e) && b.isStringLiteral(e.name)) {
            try {
              var t = JSON.parse(`${e.name.getText().replace(/'/g, '"')}`);
              if (t.includes("fragment ") && t.includes(" on ")) {
                y(t, {
                  noLocation: !0
                }).definitions.forEach((e => {
                  if ("FragmentDefinition" === e.kind) {
                    r.push(e);
                  }
                }));
              }
            } catch (e) {}
          }
        }));
      }
    }
  }));
  return r;
}

function bubbleUpTemplate(e) {
  while (b.isNoSubstitutionTemplateLiteral(e) || b.isToken(e) || b.isTemplateExpression(e) || b.isTemplateSpan(e)) {
    e = e.parent;
  }
  return e;
}

function bubbleUpCallExpression(e) {
  while (b.isStringLiteralLike(e) || b.isToken(e) || b.isTemplateExpression(e) || b.isTemplateSpan(e)) {
    e = e.parent;
  }
  return e;
}

var X = "object" == typeof performance && performance && "function" == typeof performance.now ? performance : Date;

var Y = new Set;

var J = "object" == typeof process && process ? process : {};

var emitWarning = (e, t, i, r) => {
  "function" == typeof J.emitWarning ? J.emitWarning(e, t, i, r) : console.error(`[${i}] ${t}: ${e}`);
};

var H = globalThis.AbortController;

var Z = globalThis.AbortSignal;

if (void 0 === H) {
  Z = class AbortSignal {
    _onabort=[];
    aborted=!1;
    addEventListener(e, t) {
      this._onabort.push(t);
    }
  };
  H = class AbortController {
    constructor() {
      warnACPolyfill();
    }
    signal=new Z;
    abort(e) {
      if (this.signal.aborted) {
        return;
      }
      this.signal.reason = e;
      this.signal.aborted = !0;
      for (var t of this.signal._onabort) {
        t(e);
      }
      this.signal.onabort?.(e);
    }
  };
  var ee = "1" !== J.env?.LRU_CACHE_IGNORE_AC_WARNING;
  var warnACPolyfill = () => {
    if (!ee) {
      return;
    }
    ee = !1;
    emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill);
  };
}

var isPosInt = e => e && e === Math.floor(e) && e > 0 && isFinite(e);

var getUintArray = e => !isPosInt(e) ? null : e <= Math.pow(2, 8) ? Uint8Array : e <= Math.pow(2, 16) ? Uint16Array : e <= Math.pow(2, 32) ? Uint32Array : e <= Number.MAX_SAFE_INTEGER ? ZeroArray : null;

class ZeroArray extends Array {
  constructor(e) {
    super(e);
    this.fill(0);
  }
}

class Stack {
  static #e=!1;
  static create(e) {
    var t = getUintArray(e);
    if (!t) {
      return [];
    }
    Stack.#e = !0;
    var i = new Stack(e, t);
    Stack.#e = !1;
    return i;
  }
  constructor(e, t) {
    if (!Stack.#e) {
      throw new TypeError("instantiate Stack using Stack.create(n)");
    }
    this.heap = new t(e);
    this.length = 0;
  }
  push(e) {
    this.heap[this.length++] = e;
  }
  pop() {
    return this.heap[--this.length];
  }
}

class LRUCache {
  #t;
  #i;
  #r;
  #a;
  #n;
  #s;
  #o;
  #l;
  #u;
  #c;
  #f;
  #h;
  #p;
  #d;
  #v;
  #g;
  #m;
  #S;
  #y;
  #x;
  #T;
  #E;
  static unsafeExposeInternals(e) {
    return {
      starts: e.#S,
      ttls: e.#y,
      sizes: e.#m,
      keyMap: e.#l,
      keyList: e.#u,
      valList: e.#c,
      next: e.#f,
      prev: e.#h,
      get head() {
        return e.#p;
      },
      get tail() {
        return e.#d;
      },
      free: e.#v,
      isBackgroundFetch: t => e.#A(t),
      backgroundFetch: (t, i, r, a) => e.#b(t, i, r, a),
      moveToTail: t => e.#w(t),
      indexes: t => e.#D(t),
      rindexes: t => e.#k(t),
      isStale: t => e.#C(t)
    };
  }
  get max() {
    return this.#t;
  }
  get maxSize() {
    return this.#i;
  }
  get calculatedSize() {
    return this.#o;
  }
  get size() {
    return this.#s;
  }
  get fetchMethod() {
    return this.#n;
  }
  get dispose() {
    return this.#r;
  }
  get disposeAfter() {
    return this.#a;
  }
  constructor(e) {
    var {max: t = 0, ttl: i, ttlResolution: r = 1, ttlAutopurge: a, updateAgeOnGet: n, updateAgeOnHas: s, allowStale: o, dispose: l, disposeAfter: u, noDisposeOnSet: c, noUpdateTTL: f, maxSize: h = 0, maxEntrySize: p = 0, sizeCalculation: d, fetchMethod: v, noDeleteOnFetchRejection: g, noDeleteOnStaleGet: m, allowStaleOnFetchRejection: S, allowStaleOnFetchAbort: y, ignoreFetchAbort: x} = e;
    if (0 !== t && !isPosInt(t)) {
      throw new TypeError("max option must be a nonnegative integer");
    }
    var T = t ? getUintArray(t) : Array;
    if (!T) {
      throw new Error("invalid max value: " + t);
    }
    this.#t = t;
    this.#i = h;
    this.maxEntrySize = p || this.#i;
    this.sizeCalculation = d;
    if (this.sizeCalculation) {
      if (!this.#i && !this.maxEntrySize) {
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      }
      if ("function" != typeof this.sizeCalculation) {
        throw new TypeError("sizeCalculation set to non-function");
      }
    }
    if (void 0 !== v && "function" != typeof v) {
      throw new TypeError("fetchMethod must be a function if specified");
    }
    this.#n = v;
    this.#T = !!v;
    this.#l = new Map;
    this.#u = new Array(t).fill(void 0);
    this.#c = new Array(t).fill(void 0);
    this.#f = new T(t);
    this.#h = new T(t);
    this.#p = 0;
    this.#d = 0;
    this.#v = Stack.create(t);
    this.#s = 0;
    this.#o = 0;
    if ("function" == typeof l) {
      this.#r = l;
    }
    if ("function" == typeof u) {
      this.#a = u;
      this.#g = [];
    } else {
      this.#a = void 0;
      this.#g = void 0;
    }
    this.#x = !!this.#r;
    this.#E = !!this.#a;
    this.noDisposeOnSet = !!c;
    this.noUpdateTTL = !!f;
    this.noDeleteOnFetchRejection = !!g;
    this.allowStaleOnFetchRejection = !!S;
    this.allowStaleOnFetchAbort = !!y;
    this.ignoreFetchAbort = !!x;
    if (0 !== this.maxEntrySize) {
      if (0 !== this.#i) {
        if (!isPosInt(this.#i)) {
          throw new TypeError("maxSize must be a positive integer if specified");
        }
      }
      if (!isPosInt(this.maxEntrySize)) {
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      }
      this.#F();
    }
    this.allowStale = !!o;
    this.noDeleteOnStaleGet = !!m;
    this.updateAgeOnGet = !!n;
    this.updateAgeOnHas = !!s;
    this.ttlResolution = isPosInt(r) || 0 === r ? r : 1;
    this.ttlAutopurge = !!a;
    this.ttl = i || 0;
    if (this.ttl) {
      if (!isPosInt(this.ttl)) {
        throw new TypeError("ttl must be a positive integer if specified");
      }
      this.#L();
    }
    if (0 === this.#t && 0 === this.ttl && 0 === this.#i) {
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    }
    if (!this.ttlAutopurge && !this.#t && !this.#i) {
      var E = "LRU_CACHE_UNBOUNDED";
      if ((e => !Y.has(e))(E)) {
        Y.add(E);
        emitWarning("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedCacheWarning", E, LRUCache);
      }
    }
  }
  getRemainingTTL(e) {
    return this.#l.has(e) ? 1 / 0 : 0;
  }
  #L() {
    var e = new ZeroArray(this.#t);
    var t = new ZeroArray(this.#t);
    this.#y = e;
    this.#S = t;
    this.#_ = (i, r, a = X.now()) => {
      t[i] = 0 !== r ? a : 0;
      e[i] = r;
      if (0 !== r && this.ttlAutopurge) {
        var n = setTimeout((() => {
          if (this.#C(i)) {
            this.delete(this.#u[i]);
          }
        }), r + 1);
        if (n.unref) {
          n.unref();
        }
      }
    };
    this.#N = i => {
      t[i] = 0 !== e[i] ? X.now() : 0;
    };
    this.#O = (r, a) => {
      if (e[a]) {
        var n = e[a];
        var s = t[a];
        r.ttl = n;
        r.start = s;
        r.now = i || getNow();
        r.remainingTTL = n - (r.now - s);
      }
    };
    var i = 0;
    var getNow = () => {
      var e = X.now();
      if (this.ttlResolution > 0) {
        i = e;
        var t = setTimeout((() => i = 0), this.ttlResolution);
        if (t.unref) {
          t.unref();
        }
      }
      return e;
    };
    this.getRemainingTTL = r => {
      var a = this.#l.get(r);
      if (void 0 === a) {
        return 0;
      }
      var n = e[a];
      var s = t[a];
      if (0 === n || 0 === s) {
        return 1 / 0;
      }
      return n - ((i || getNow()) - s);
    };
    this.#C = r => 0 !== e[r] && 0 !== t[r] && (i || getNow()) - t[r] > e[r];
  }
  #N=() => {};
  #O=() => {};
  #_=() => {};
  #C=() => !1;
  #F() {
    var e = new ZeroArray(this.#t);
    this.#o = 0;
    this.#m = e;
    this.#I = t => {
      this.#o -= e[t];
      e[t] = 0;
    };
    this.#z = (e, t, i, r) => {
      if (this.#A(t)) {
        return 0;
      }
      if (!isPosInt(i)) {
        if (r) {
          if ("function" != typeof r) {
            throw new TypeError("sizeCalculation must be a function");
          }
          i = r(t, e);
          if (!isPosInt(i)) {
            throw new TypeError("sizeCalculation return invalid (expect positive integer)");
          }
        } else {
          throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
        }
      }
      return i;
    };
    this.#P = (t, i, r) => {
      e[t] = i;
      if (this.#i) {
        var a = this.#i - e[t];
        while (this.#o > a) {
          this.#$(!0);
        }
      }
      this.#o += e[t];
      if (r) {
        r.entrySize = i;
        r.totalCalculatedSize = this.#o;
      }
    };
  }
  #I=e => {};
  #P=(e, t, i) => {};
  #z=(e, t, i, r) => {
    if (i || r) {
      throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
    }
    return 0;
  };
  * #D({allowStale: e = this.allowStale} = {}) {
    if (this.#s) {
      for (var t = this.#d; 1; ) {
        if (!this.#V(t)) {
          break;
        }
        if (e || !this.#C(t)) {
          yield t;
        }
        if (t === this.#p) {
          break;
        } else {
          t = this.#h[t];
        }
      }
    }
  }
  * #k({allowStale: e = this.allowStale} = {}) {
    if (this.#s) {
      for (var t = this.#p; 1; ) {
        if (!this.#V(t)) {
          break;
        }
        if (e || !this.#C(t)) {
          yield t;
        }
        if (t === this.#d) {
          break;
        } else {
          t = this.#f[t];
        }
      }
    }
  }
  #V(e) {
    return void 0 !== e && this.#l.get(this.#u[e]) === e;
  }
  * entries() {
    for (var e of this.#D()) {
      if (void 0 !== this.#c[e] && void 0 !== this.#u[e] && !this.#A(this.#c[e])) {
        yield [ this.#u[e], this.#c[e] ];
      }
    }
  }
  * rentries() {
    for (var e of this.#k()) {
      if (void 0 !== this.#c[e] && void 0 !== this.#u[e] && !this.#A(this.#c[e])) {
        yield [ this.#u[e], this.#c[e] ];
      }
    }
  }
  * keys() {
    for (var e of this.#D()) {
      var t = this.#u[e];
      if (void 0 !== t && !this.#A(this.#c[e])) {
        yield t;
      }
    }
  }
  * rkeys() {
    for (var e of this.#k()) {
      var t = this.#u[e];
      if (void 0 !== t && !this.#A(this.#c[e])) {
        yield t;
      }
    }
  }
  * values() {
    for (var e of this.#D()) {
      if (void 0 !== this.#c[e] && !this.#A(this.#c[e])) {
        yield this.#c[e];
      }
    }
  }
  * rvalues() {
    for (var e of this.#k()) {
      if (void 0 !== this.#c[e] && !this.#A(this.#c[e])) {
        yield this.#c[e];
      }
    }
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  find(e, t = {}) {
    for (var i of this.#D()) {
      var r = this.#c[i];
      var a = this.#A(r) ? r.__staleWhileFetching : r;
      if (void 0 === a) {
        continue;
      }
      if (e(a, this.#u[i], this)) {
        return this.get(this.#u[i], t);
      }
    }
  }
  forEach(e, t = this) {
    for (var i of this.#D()) {
      var r = this.#c[i];
      var a = this.#A(r) ? r.__staleWhileFetching : r;
      if (void 0 === a) {
        continue;
      }
      e.call(t, a, this.#u[i], this);
    }
  }
  rforEach(e, t = this) {
    for (var i of this.#k()) {
      var r = this.#c[i];
      var a = this.#A(r) ? r.__staleWhileFetching : r;
      if (void 0 === a) {
        continue;
      }
      e.call(t, a, this.#u[i], this);
    }
  }
  purgeStale() {
    var e = !1;
    for (var t of this.#k({
      allowStale: !0
    })) {
      if (this.#C(t)) {
        this.delete(this.#u[t]);
        e = !0;
      }
    }
    return e;
  }
  dump() {
    var e = [];
    for (var t of this.#D({
      allowStale: !0
    })) {
      var i = this.#u[t];
      var r = this.#c[t];
      var a = this.#A(r) ? r.__staleWhileFetching : r;
      if (void 0 === a || void 0 === i) {
        continue;
      }
      var n = {
        value: a
      };
      if (this.#y && this.#S) {
        n.ttl = this.#y[t];
        var s = X.now() - this.#S[t];
        n.start = Math.floor(Date.now() - s);
      }
      if (this.#m) {
        n.size = this.#m[t];
      }
      e.unshift([ i, n ]);
    }
    return e;
  }
  load(e) {
    this.clear();
    for (var [t, i] of e) {
      if (i.start) {
        var r = Date.now() - i.start;
        i.start = X.now() - r;
      }
      this.set(t, i.value, i);
    }
  }
  set(e, t, i = {}) {
    if (void 0 === t) {
      this.delete(e);
      return this;
    }
    var {ttl: r = this.ttl, start: a, noDisposeOnSet: n = this.noDisposeOnSet, sizeCalculation: s = this.sizeCalculation, status: o} = i;
    var {noUpdateTTL: l = this.noUpdateTTL} = i;
    var u = this.#z(e, t, i.size || 0, s);
    if (this.maxEntrySize && u > this.maxEntrySize) {
      if (o) {
        o.set = "miss";
        o.maxEntrySizeExceeded = !0;
      }
      this.delete(e);
      return this;
    }
    var c = 0 === this.#s ? void 0 : this.#l.get(e);
    if (void 0 === c) {
      c = 0 === this.#s ? this.#d : 0 !== this.#v.length ? this.#v.pop() : this.#s === this.#t ? this.#$(!1) : this.#s;
      this.#u[c] = e;
      this.#c[c] = t;
      this.#l.set(e, c);
      this.#f[this.#d] = c;
      this.#h[c] = this.#d;
      this.#d = c;
      this.#s++;
      this.#P(c, u, o);
      if (o) {
        o.set = "add";
      }
      l = !1;
    } else {
      this.#w(c);
      var f = this.#c[c];
      if (t !== f) {
        if (this.#T && this.#A(f)) {
          f.__abortController.abort(new Error("replaced"));
          var {__staleWhileFetching: h} = f;
          if (void 0 !== h && !n) {
            if (this.#x) {
              this.#r?.(h, e, "set");
            }
            if (this.#E) {
              this.#g?.push([ h, e, "set" ]);
            }
          }
        } else if (!n) {
          if (this.#x) {
            this.#r?.(f, e, "set");
          }
          if (this.#E) {
            this.#g?.push([ f, e, "set" ]);
          }
        }
        this.#I(c);
        this.#P(c, u, o);
        this.#c[c] = t;
        if (o) {
          o.set = "replace";
          var p = f && this.#A(f) ? f.__staleWhileFetching : f;
          if (void 0 !== p) {
            o.oldValue = p;
          }
        }
      } else if (o) {
        o.set = "update";
      }
    }
    if (0 !== r && !this.#y) {
      this.#L();
    }
    if (this.#y) {
      if (!l) {
        this.#_(c, r, a);
      }
      if (o) {
        this.#O(o, c);
      }
    }
    if (!n && this.#E && this.#g) {
      var d = this.#g;
      var v;
      while (v = d?.shift()) {
        this.#a?.(...v);
      }
    }
    return this;
  }
  pop() {
    try {
      while (this.#s) {
        var e = this.#c[this.#p];
        this.#$(!0);
        if (this.#A(e)) {
          if (e.__staleWhileFetching) {
            return e.__staleWhileFetching;
          }
        } else if (void 0 !== e) {
          return e;
        }
      }
    } finally {
      if (this.#E && this.#g) {
        var t = this.#g;
        var i;
        while (i = t?.shift()) {
          this.#a?.(...i);
        }
      }
    }
  }
  #$(e) {
    var t = this.#p;
    var i = this.#u[t];
    var r = this.#c[t];
    if (this.#T && this.#A(r)) {
      r.__abortController.abort(new Error("evicted"));
    } else if (this.#x || this.#E) {
      if (this.#x) {
        this.#r?.(r, i, "evict");
      }
      if (this.#E) {
        this.#g?.push([ r, i, "evict" ]);
      }
    }
    this.#I(t);
    if (e) {
      this.#u[t] = void 0;
      this.#c[t] = void 0;
      this.#v.push(t);
    }
    if (1 === this.#s) {
      this.#p = this.#d = 0;
      this.#v.length = 0;
    } else {
      this.#p = this.#f[t];
    }
    this.#l.delete(i);
    this.#s--;
    return t;
  }
  has(e, t = {}) {
    var {updateAgeOnHas: i = this.updateAgeOnHas, status: r} = t;
    var a = this.#l.get(e);
    if (void 0 !== a) {
      var n = this.#c[a];
      if (this.#A(n) && void 0 === n.__staleWhileFetching) {
        return !1;
      }
      if (!this.#C(a)) {
        if (i) {
          this.#N(a);
        }
        if (r) {
          r.has = "hit";
          this.#O(r, a);
        }
        return !0;
      } else if (r) {
        r.has = "stale";
        this.#O(r, a);
      }
    } else if (r) {
      r.has = "miss";
    }
    return !1;
  }
  peek(e, t = {}) {
    var {allowStale: i = this.allowStale} = t;
    var r = this.#l.get(e);
    if (void 0 !== r && (i || !this.#C(r))) {
      var a = this.#c[r];
      return this.#A(a) ? a.__staleWhileFetching : a;
    }
  }
  #b(e, t, i, r) {
    var a = void 0 === t ? void 0 : this.#c[t];
    if (this.#A(a)) {
      return a;
    }
    var n = new H;
    var {signal: s} = i;
    s?.addEventListener("abort", (() => n.abort(s.reason)), {
      signal: n.signal
    });
    var o = {
      signal: n.signal,
      options: i,
      context: r
    };
    var cb = (r, a = !1) => {
      var {aborted: s} = n.signal;
      var u = i.ignoreFetchAbort && void 0 !== r;
      if (i.status) {
        if (s && !a) {
          i.status.fetchAborted = !0;
          i.status.fetchError = n.signal.reason;
          if (u) {
            i.status.fetchAbortIgnored = !0;
          }
        } else {
          i.status.fetchResolved = !0;
        }
      }
      if (s && !u && !a) {
        return fetchFail(n.signal.reason);
      }
      if (this.#c[t] === l) {
        if (void 0 === r) {
          if (l.__staleWhileFetching) {
            this.#c[t] = l.__staleWhileFetching;
          } else {
            this.delete(e);
          }
        } else {
          if (i.status) {
            i.status.fetchUpdated = !0;
          }
          this.set(e, r, o.options);
        }
      }
      return r;
    };
    var fetchFail = r => {
      var {aborted: a} = n.signal;
      var s = a && i.allowStaleOnFetchAbort;
      var o = s || i.allowStaleOnFetchRejection;
      var u = l;
      if (this.#c[t] === l) {
        if (!(o || i.noDeleteOnFetchRejection) || void 0 === u.__staleWhileFetching) {
          this.delete(e);
        } else if (!s) {
          this.#c[t] = u.__staleWhileFetching;
        }
      }
      if (o) {
        if (i.status && void 0 !== u.__staleWhileFetching) {
          i.status.returnedStale = !0;
        }
        return u.__staleWhileFetching;
      } else if (u.__returned === u) {
        throw r;
      }
    };
    if (i.status) {
      i.status.fetchDispatched = !0;
    }
    var l = new Promise(((t, r) => {
      var s = this.#n?.(e, a, o);
      if (s && s instanceof Promise) {
        s.then((e => t(void 0 === e ? void 0 : e)), r);
      }
      n.signal.addEventListener("abort", (() => {
        if (!i.ignoreFetchAbort || i.allowStaleOnFetchAbort) {
          t(void 0);
          if (i.allowStaleOnFetchAbort) {
            t = e => cb(e, !0);
          }
        }
      }));
    })).then(cb, (e => {
      if (i.status) {
        i.status.fetchRejected = !0;
        i.status.fetchError = e;
      }
      return fetchFail(e);
    }));
    var u = Object.assign(l, {
      __abortController: n,
      __staleWhileFetching: a,
      __returned: void 0
    });
    if (void 0 === t) {
      this.set(e, u, {
        ...o.options,
        status: void 0
      });
      t = this.#l.get(e);
    } else {
      this.#c[t] = u;
    }
    return u;
  }
  #A(e) {
    if (!this.#T) {
      return !1;
    }
    var t = e;
    return !!t && t instanceof Promise && t.hasOwnProperty("__staleWhileFetching") && t.__abortController instanceof H;
  }
  async fetch(e, t = {}) {
    var {allowStale: i = this.allowStale, updateAgeOnGet: r = this.updateAgeOnGet, noDeleteOnStaleGet: a = this.noDeleteOnStaleGet, ttl: n = this.ttl, noDisposeOnSet: s = this.noDisposeOnSet, size: o = 0, sizeCalculation: l = this.sizeCalculation, noUpdateTTL: u = this.noUpdateTTL, noDeleteOnFetchRejection: c = this.noDeleteOnFetchRejection, allowStaleOnFetchRejection: f = this.allowStaleOnFetchRejection, ignoreFetchAbort: h = this.ignoreFetchAbort, allowStaleOnFetchAbort: p = this.allowStaleOnFetchAbort, context: d, forceRefresh: v = !1, status: g, signal: m} = t;
    if (!this.#T) {
      if (g) {
        g.fetch = "get";
      }
      return this.get(e, {
        allowStale: i,
        updateAgeOnGet: r,
        noDeleteOnStaleGet: a,
        status: g
      });
    }
    var S = {
      allowStale: i,
      updateAgeOnGet: r,
      noDeleteOnStaleGet: a,
      ttl: n,
      noDisposeOnSet: s,
      size: o,
      sizeCalculation: l,
      noUpdateTTL: u,
      noDeleteOnFetchRejection: c,
      allowStaleOnFetchRejection: f,
      allowStaleOnFetchAbort: p,
      ignoreFetchAbort: h,
      status: g,
      signal: m
    };
    var y = this.#l.get(e);
    if (void 0 === y) {
      if (g) {
        g.fetch = "miss";
      }
      var x = this.#b(e, y, S, d);
      return x.__returned = x;
    } else {
      var T = this.#c[y];
      if (this.#A(T)) {
        var E = i && void 0 !== T.__staleWhileFetching;
        if (g) {
          g.fetch = "inflight";
          if (E) {
            g.returnedStale = !0;
          }
        }
        return E ? T.__staleWhileFetching : T.__returned = T;
      }
      var A = this.#C(y);
      if (!v && !A) {
        if (g) {
          g.fetch = "hit";
        }
        this.#w(y);
        if (r) {
          this.#N(y);
        }
        if (g) {
          this.#O(g, y);
        }
        return T;
      }
      var b = this.#b(e, y, S, d);
      var w = void 0 !== b.__staleWhileFetching && i;
      if (g) {
        g.fetch = A ? "stale" : "refresh";
        if (w && A) {
          g.returnedStale = !0;
        }
      }
      return w ? b.__staleWhileFetching : b.__returned = b;
    }
  }
  get(e, t = {}) {
    var {allowStale: i = this.allowStale, updateAgeOnGet: r = this.updateAgeOnGet, noDeleteOnStaleGet: a = this.noDeleteOnStaleGet, status: n} = t;
    var s = this.#l.get(e);
    if (void 0 !== s) {
      var o = this.#c[s];
      var l = this.#A(o);
      if (n) {
        this.#O(n, s);
      }
      if (this.#C(s)) {
        if (n) {
          n.get = "stale";
        }
        if (!l) {
          if (!a) {
            this.delete(e);
          }
          if (n && i) {
            n.returnedStale = !0;
          }
          return i ? o : void 0;
        } else {
          if (n && i && void 0 !== o.__staleWhileFetching) {
            n.returnedStale = !0;
          }
          return i ? o.__staleWhileFetching : void 0;
        }
      } else {
        if (n) {
          n.get = "hit";
        }
        if (l) {
          return o.__staleWhileFetching;
        }
        this.#w(s);
        if (r) {
          this.#N(s);
        }
        return o;
      }
    } else if (n) {
      n.get = "miss";
    }
  }
  #R(e, t) {
    this.#h[t] = e;
    this.#f[e] = t;
  }
  #w(e) {
    if (e !== this.#d) {
      if (e === this.#p) {
        this.#p = this.#f[e];
      } else {
        this.#R(this.#h[e], this.#f[e]);
      }
      this.#R(this.#d, e);
      this.#d = e;
    }
  }
  delete(e) {
    var t = !1;
    if (0 !== this.#s) {
      var i = this.#l.get(e);
      if (void 0 !== i) {
        t = !0;
        if (1 === this.#s) {
          this.clear();
        } else {
          this.#I(i);
          var r = this.#c[i];
          if (this.#A(r)) {
            r.__abortController.abort(new Error("deleted"));
          } else if (this.#x || this.#E) {
            if (this.#x) {
              this.#r?.(r, e, "delete");
            }
            if (this.#E) {
              this.#g?.push([ r, e, "delete" ]);
            }
          }
          this.#l.delete(e);
          this.#u[i] = void 0;
          this.#c[i] = void 0;
          if (i === this.#d) {
            this.#d = this.#h[i];
          } else if (i === this.#p) {
            this.#p = this.#f[i];
          } else {
            this.#f[this.#h[i]] = this.#f[i];
            this.#h[this.#f[i]] = this.#h[i];
          }
          this.#s--;
          this.#v.push(i);
        }
      }
    }
    if (this.#E && this.#g?.length) {
      var a = this.#g;
      var n;
      while (n = a?.shift()) {
        this.#a?.(...n);
      }
    }
    return t;
  }
  clear() {
    for (var e of this.#k({
      allowStale: !0
    })) {
      var t = this.#c[e];
      if (this.#A(t)) {
        t.__abortController.abort(new Error("deleted"));
      } else {
        var i = this.#u[e];
        if (this.#x) {
          this.#r?.(t, i, "delete");
        }
        if (this.#E) {
          this.#g?.push([ t, i, "delete" ]);
        }
      }
    }
    this.#l.clear();
    this.#c.fill(void 0);
    this.#u.fill(void 0);
    if (this.#y && this.#S) {
      this.#y.fill(0);
      this.#S.fill(0);
    }
    if (this.#m) {
      this.#m.fill(0);
    }
    this.#p = 0;
    this.#d = 0;
    this.#v.length = 0;
    this.#o = 0;
    this.#s = 0;
    if (this.#E && this.#g) {
      var r = this.#g;
      var a;
      while (a = r?.shift()) {
        this.#a?.(...a);
      }
    }
  }
}

var te = {
  exports: {}
};

var ie = {
  32: 16777619n,
  64: 1099511628211n,
  128: 309485009821345068724781371n,
  256: 374144419156711147060143317175368453031918731002211n,
  512: 35835915874844867368919076489095108449946327955754392558399825615420669938882575126094039892345713852759n,
  1024: 5016456510113118655434598811035278955030765345404790744303017523831112055108147451509157692220295382716162651878526895249385292291816524375083746691371804094271873160484737966720260389217684476157468082573n
};

var re = {
  32: 2166136261n,
  64: 14695981039346656037n,
  128: 144066263297769815596495629667062367629n,
  256: 100029257958052580907070968620625704837092796014241193945225284501741471925557n,
  512: 9659303129496669498009435400716310466090418745672637896108374329434462657994582932197716438449813051892206539805784495328239340083876191928701583869517785n,
  1024: 14197795064947621068722070641403218320880622795441933960878474914617582723252296732303717722150864096521202355549365628174669108571814760471015076148029755969804077320157692458563003215304957150157403644460363550505412711285966361610267868082893823963790439336411086884584107735010676915n
};

te.exports = function fnv1a(e) {
  var t = Number(re[32]);
  var i = !1;
  for (var r = 0; r < e.length; r++) {
    var a = e.charCodeAt(r);
    if (a > 127 && !i) {
      a = (e = unescape(encodeURIComponent(e))).charCodeAt(r);
      i = !0;
    }
    t ^= a;
    t += (t << 1) + (t << 4) + (t << 7) + (t << 8) + (t << 24);
  }
  return t >>> 0;
};

te.exports.bigInt = function bigInt(e, {size: t = 32} = {}) {
  if (!ie[t]) {
    throw new Error("The `size` option must be one of 32, 64, 128, 256, 512, or 1024");
  }
  var i = re[t];
  var r = ie[t];
  var a = !1;
  for (var n = 0; n < e.length; n++) {
    var s = e.charCodeAt(n);
    if (s > 127 && !a) {
      s = (e = unescape(encodeURIComponent(e))).charCodeAt(n);
      a = !0;
    }
    i ^= BigInt(s);
    i = BigInt.asUintN(t, i * r);
  }
  return i;
};

var ae = getDefaultExportFromCjs(te.exports);

var ne = 52005;

var unwrapAbstractType = e => e.isUnionOrIntersection() ? e.types.find((e => e.flags & b.TypeFlags.Object)) || e : e;

var getVariableDeclaration = e => {
  var t = e;
  var i = new Set;
  while (t.parent && !i.has(t)) {
    i.add(t);
    if (b.isBlock(t)) {
      return;
    } else if (b.isVariableDeclaration(t = t.parent)) {
      return t;
    }
  }
};

var traverseArrayDestructuring = (e, t, i, r, a) => e.elements.flatMap((e => {
  if (b.isOmittedExpression(e)) {
    return [];
  }
  var n = [ ...t ];
  return b.isIdentifier(e.name) ? crawlScope(e.name, n, i, r, a, !1) : b.isObjectBindingPattern(e.name) ? traverseDestructuring(e.name, n, i, r, a) : traverseArrayDestructuring(e.name, n, i, r, a);
}));

var traverseDestructuring = (e, t, i, r, a) => {
  var n = [];
  var _loop = function() {
    if (b.isObjectBindingPattern(s.name)) {
      var e = [ ...t ];
      if (s.propertyName && !t.includes(s.propertyName.getText())) {
        var o = [ ...e, s.propertyName.getText() ].join(".");
        if (i.find((e => e.startsWith(o)))) {
          e.push(s.propertyName.getText());
        }
      }
      var l = traverseDestructuring(s.name, e, i, r, a);
      n.push(...l);
    } else if (b.isIdentifier(s.name)) {
      var u = [ ...t ];
      if (s.propertyName && !t.includes(s.propertyName.getText())) {
        var c = [ ...u, s.propertyName.getText() ].join(".");
        if (i.find((e => e.startsWith(c)))) {
          u.push(s.propertyName.getText());
        }
      } else {
        var f = [ ...u, s.name.getText() ].join(".");
        if (i.find((e => e.startsWith(f)))) {
          u.push(s.name.getText());
        }
      }
      var h = crawlScope(s.name, u, i, r, a, !1);
      n.push(...h);
    }
  };
  for (var s of e.elements) {
    _loop();
  }
  return n;
};

var se = new Set([ "map", "filter", "forEach", "reduce", "every", "some", "find", "flatMap", "sort" ]);

var crawlChainedExpressions = (e, t, i, r, a) => {
  if (b.isPropertyAccessExpression(e.expression) && se.has(e.expression.name.text)) {
    var n = "reduce" === e.expression.name.text;
    var s = e.arguments[0];
    var o = [];
    if (b.isCallExpression(e.parent.parent)) {
      var l = crawlChainedExpressions(e.parent.parent, t, i, r, a);
      if (l.length) {
        o.push(...l);
      }
    }
    if (s && b.isIdentifier(s)) {
      var u = getValueOfIdentifier(s, a.languageService.getProgram().getTypeChecker());
      if (u && (b.isFunctionDeclaration(u) || b.isFunctionExpression(u) || b.isArrowFunction(u))) {
        s = u;
      }
    }
    if (s && (b.isFunctionDeclaration(s) || b.isFunctionExpression(s) || b.isArrowFunction(s))) {
      var c = s.parameters[n ? 1 : 0];
      if (c) {
        var f = crawlScope(c.name, t, i, r, a, !0);
        if (f.length) {
          o.push(...f);
        }
      }
    }
    return o;
  }
  return [];
};

var crawlScope = (e, t, i, r, a, n) => {
  if (b.isObjectBindingPattern(e)) {
    return traverseDestructuring(e, t, i, r, a);
  } else if (b.isArrayBindingPattern(e)) {
    return traverseArrayDestructuring(e, t, i, r, a);
  }
  var s = [];
  var o = a.languageService.getReferencesAtPosition(r.fileName, e.getStart());
  if (!o) {
    return s;
  }
  return s = o.flatMap((s => {
    if (s.fileName !== r.fileName) {
      return [];
    }
    if (e.getStart() <= s.textSpan.start && e.getEnd() >= s.textSpan.start + s.textSpan.length) {
      return [];
    }
    var o = findNode(r, s.textSpan.start);
    if (!o) {
      return [];
    }
    var l = [ ...t ];
    var u, _loop2 = function() {
      if (!n && (b.isReturnStatement(o) || b.isArrowFunction(o))) {
        var e = l.join(".");
        return {
          v: i.filter((t => t.startsWith(e + ".")))
        };
      } else if (b.isVariableDeclaration(o)) {
        return {
          v: crawlScope(o.name, l, i, r, a, !1)
        };
      } else if (b.isIdentifier(o) && !l.includes(o.text)) {
        var t = [ ...l, o.text ].join(".");
        if (i.find((e => e.startsWith(t + ".")))) {
          l.push(o.text);
        }
        if (b.isCallExpression(o.parent)) {
          return {
            v: o.parent.arguments.flatMap((e => {
              var t = [ ...l ];
              var r = e;
              var _loop3 = function() {
                var e = [ ...t, r.name.text ].join(".");
                if (i.find((t => t.startsWith(e + ".")))) {
                  t.push(r.name.text);
                }
                r = r.expression;
              };
              while (b.isPropertyAccessExpression(r)) {
                _loop3();
              }
              if (b.isIdentifier(r)) {
                var a = [ ...t, r.getText() ].join(".");
                if (i.find((e => e.startsWith(a + ".")))) {
                  t.push(r.getText());
                }
              }
              var n = t.join(".");
              return i.filter((e => e.startsWith(n + ".")));
            }))
          };
        }
      } else if (b.isPropertyAccessExpression(o) && "at" === o.name.text && b.isCallExpression(o.parent)) {
        o = o.parent;
      } else if (b.isPropertyAccessExpression(o) && se.has(o.name.text) && b.isCallExpression(o.parent)) {
        var s = o.parent;
        var u = [];
        var c = "some" === o.name.text || "every" === o.name.text;
        var f = crawlChainedExpressions(s, l, i, r, a);
        if (f.length) {
          u.push(...f);
        }
        if (b.isVariableDeclaration(s.parent) && !c) {
          var h = crawlScope(s.parent.name, l, i, r, a, !0);
          u.push(...h);
        }
        return {
          v: u
        };
      } else if (b.isPropertyAccessExpression(o) && !l.includes(o.name.text)) {
        var p = [ ...l, o.name.text ].join(".");
        if (i.find((e => e.startsWith(p)))) {
          l.push(o.name.text);
        }
      } else if (b.isElementAccessExpression(o) && b.isStringLiteral(o.argumentExpression) && !l.includes(o.argumentExpression.text)) {
        var d = [ ...l, o.argumentExpression.text ].join(".");
        if (i.find((e => e.startsWith(d)))) {
          l.push(o.argumentExpression.text);
        }
      }
      if (b.isNonNullExpression(o.parent)) {
        o = o.parent.parent;
      } else {
        o = o.parent;
      }
    };
    while (b.isIdentifier(o) || b.isPropertyAccessExpression(o) || b.isElementAccessExpression(o) || b.isVariableDeclaration(o) || b.isBinaryExpression(o) || b.isReturnStatement(o) || b.isArrowFunction(o)) {
      if (u = _loop2()) {
        return u.v;
      }
    }
    return l.join(".");
  }));
};

var getColocatedFragmentNames = (e, t) => {
  var i = function findAllImports(e) {
    return e.statements.filter(b.isImportDeclaration);
  }(e);
  var r = t.languageService.getProgram()?.getTypeChecker();
  var a = {};
  if (!r) {
    return a;
  }
  if (i.length) {
    i.forEach((e => {
      if (!e.importClause) {
        return;
      }
      if (e.importClause.name) {
        var i = getDeclarationOfIdentifier(e.importClause.name, r);
        if (i) {
          var n = i.getSourceFile();
          if (n.fileName.includes("node_modules")) {
            return;
          }
          if (!n) {
            return;
          }
          var s = getFragmentsInSource(n, r, t).map((e => e.name.value));
          var o = e.moduleSpecifier.getText();
          var l = a[o];
          if (s.length && l) {
            l.fragments = l.fragments.concat(s);
          } else if (s.length && !l) {
            a[o] = l = {
              start: e.moduleSpecifier.getStart(),
              length: e.moduleSpecifier.getText().length,
              fragments: s
            };
          }
        }
      }
      if (e.importClause.namedBindings && b.isNamespaceImport(e.importClause.namedBindings)) {
        var u = getDeclarationOfIdentifier(e.importClause.namedBindings.name, r);
        if (u) {
          var c = u.getSourceFile();
          if (c.fileName.includes("node_modules")) {
            return;
          }
          if (!c) {
            return;
          }
          var f = getFragmentsInSource(c, r, t).map((e => e.name.value));
          var h = e.moduleSpecifier.getText();
          var p = a[h];
          if (f.length && p) {
            p.fragments = p.fragments.concat(f);
          } else if (f.length && !p) {
            a[h] = p = {
              start: e.moduleSpecifier.getStart(),
              length: e.moduleSpecifier.getText().length,
              fragments: f
            };
          }
        }
      } else if (e.importClause.namedBindings && b.isNamedImportBindings(e.importClause.namedBindings)) {
        e.importClause.namedBindings.elements.forEach((i => {
          var n = i.name || i.propertyName;
          if (!n) {
            return;
          }
          var s = getDeclarationOfIdentifier(n, r);
          if (s) {
            var o = s.getSourceFile();
            if (o.fileName.includes("node_modules")) {
              return;
            }
            if (!o) {
              return;
            }
            var l = getFragmentsInSource(o, r, t).map((e => e.name.value));
            var u = e.moduleSpecifier.getText();
            var c = a[u];
            if (l.length && c) {
              c.fragments = c.fragments.concat(l);
            } else if (l.length && !c) {
              a[u] = c = {
                start: e.moduleSpecifier.getStart(),
                length: e.moduleSpecifier.getText().length,
                fragments: l
              };
            }
          }
        }));
      }
    }));
  }
  return a;
};

function getFragmentsInSource(t, i, r) {
  var a = [];
  var n = findAllCallExpressions(t, r, !1);
  var s = i.getSymbolAtLocation(t);
  if (!s) {
    return [];
  }
  var o = i.getExportsOfModule(s).map((e => e.name));
  n.nodes.filter((e => {
    var t = e.node.parent;
    while (t && !b.isSourceFile(t) && !b.isVariableDeclaration(t)) {
      t = t.parent;
    }
    if (b.isVariableDeclaration(t)) {
      return o.includes(t.name.getText());
    } else {
      return !1;
    }
  })).forEach((t => {
    var i = resolveTemplate(t.node, 0, r).combinedText;
    try {
      var n = y(i, {
        noLocation: !0
      });
      if (n.definitions.every((t => t.kind === e.FRAGMENT_DEFINITION))) {
        a = a.concat(n.definitions);
      }
    } catch (e) {
      return;
    }
  }));
  return a;
}

function getPersistedCodeFixAtPosition(e, t, i) {
  var r = i.config.templateIsCallExpression ?? !0;
  var a = i.languageService.getProgram()?.getTypeChecker();
  if (!r) {
    return;
  }
  var n = getSource(i, e);
  if (!n) {
    return;
  }
  var s = findNode(n, t);
  if (!s) {
    return;
  }
  var o = s;
  if (b.isVariableStatement(o)) {
    o = o.declarationList.declarations.find((e => b.isVariableDeclaration(e) && e.initializer && b.isCallExpression(e.initializer))) || s;
  } else if (b.isVariableDeclarationList(o)) {
    o = o.declarations.find((e => b.isVariableDeclaration(e) && e.initializer && b.isCallExpression(e.initializer))) || s;
  } else if (b.isVariableDeclaration(o) && o.initializer && b.isCallExpression(o.initializer)) {
    o = o.initializer;
  } else {
    while (o && !b.isCallExpression(o)) {
      o = o.parent;
    }
  }
  if (!isTadaPersistedCall(o, a)) {
    return;
  }
  var l, u = e;
  if (o.typeArguments) {
    var [c] = o.typeArguments;
    if (!c || !b.isTypeQueryNode(c)) {
      return;
    }
    var {node: f, filename: h} = getDocumentReferenceFromTypeQuery(c, e, i);
    l = f;
    u = h;
  } else if (o.arguments[1]) {
    if (!b.isIdentifier(o.arguments[1]) && !b.isCallExpression(o.arguments[1])) {
      return;
    }
    var {node: p, filename: d} = getDocumentReferenceFromDocumentNode(o.arguments[1], e, i);
    l = p;
    u = d;
  }
  if (!l) {
    return;
  }
  var v = l;
  if (!(v && b.isCallExpression(v) && v.arguments[0] && b.isStringLiteralLike(v.arguments[0]))) {
    return;
  }
  var g = generateHashForDocument(i, v.arguments[0], u, v.arguments[1] && b.isArrayLiteralExpression(v.arguments[1]) ? v.arguments[1] : void 0);
  var m = o.arguments[0];
  if (!m) {
    return {
      span: {
        start: o.arguments.pos,
        length: 1
      },
      replacement: `"sha256:${g}")`
    };
  } else if (b.isStringLiteral(m) && m.getText() !== `"sha256:${g}"`) {
    return {
      span: {
        start: m.getStart(),
        length: m.end - m.getStart()
      },
      replacement: `"sha256:${g}"`
    };
  } else if (b.isIdentifier(m)) {
    return {
      span: {
        start: m.getStart(),
        length: m.end - m.getStart()
      },
      replacement: `"sha256:${g}"`
    };
  } else {
    return;
  }
}

var generateHashForDocument = (e, t, i, r) => {
  if (r) {
    var a = [];
    unrollTadaFragments(r, a, e);
    var n = resolveTemplate(t, 0, e).combinedText;
    var s = parse(n);
    var o = new Set;
    for (var l of s.definitions) {
      if (l.kind === L && !o.has(l)) {
        stripUnmaskDirectivesFromDefinition(l);
      }
    }
    a.map((e => {
      stripUnmaskDirectivesFromDefinition(e);
      return print(e);
    })).filter(((e, t, i) => i.indexOf(e) === t)).forEach((e => {
      n = `${n}\n\n${e}`;
    }));
    var u = print(parse(n));
    return A("sha256").update(u).digest("hex");
  } else {
    var c = getSource(e, i);
    var {fragments: f} = findAllCallExpressions(c, e);
    var h = resolveTemplate(t, 0, e).combinedText;
    var p = parse(h);
    var d = new Set;
    for (var v of p.definitions) {
      if (v.kind === L && !d.has(v)) {
        stripUnmaskDirectivesFromDefinition(v);
      }
    }
    var g = new Set;
    visit(p, {
      FragmentDefinition: e => {
        f.push(e);
      },
      FragmentSpread: e => {
        g.add(e.name.value);
      }
    });
    var m = h;
    var S = new Set;
    var y = [ ...g ];
    var x;
    while (x = y.shift()) {
      S.add(x);
      var T = f.find((e => e.name.value === x));
      if (!T) {
        e.project.projectService.logger.info(`[GraphQLSP] could not find fragment for spread ${x}!`);
        return;
      }
      stripUnmaskDirectivesFromDefinition(T);
      visit(T, {
        FragmentSpread: e => {
          if (!S.has(e.name.value)) {
            y.push(e.name.value);
          }
        }
      });
      m = `${m}\n\n${print(T)}`;
    }
    return A("sha256").update(print(parse(m))).digest("hex");
  }
};

var getDocumentReferenceFromTypeQuery = (e, t, i) => {
  var r = i.languageService.getProgram()?.getTypeChecker();
  if (!r) {
    return {
      node: null,
      filename: t
    };
  }
  var a;
  if (b.isIdentifier(e.exprName)) {
    a = e.exprName;
  } else if (b.isQualifiedName(e.exprName)) {
    a = e.exprName.right;
  }
  if (!a) {
    return {
      node: null,
      filename: t
    };
  }
  var n = getValueOfIdentifier(a, r);
  if (!n || !isGraphQLCall(n, r)) {
    return {
      node: null,
      filename: t
    };
  }
  return {
    node: n,
    filename: n.getSourceFile().fileName
  };
};

var getDocumentReferenceFromDocumentNode = (e, t, i) => {
  if (b.isIdentifier(e)) {
    var r = i.languageService.getProgram()?.getTypeChecker();
    if (!r) {
      return {
        node: null,
        filename: t
      };
    }
    var a = getValueOfIdentifier(e, r);
    if (!a || !isGraphQLCall(a, r)) {
      return {
        node: null,
        filename: t
      };
    }
    return {
      node: a,
      filename: a.getSourceFile().fileName
    };
  } else {
    return {
      node: e,
      filename: t
    };
  }
};

var stripUnmaskDirectivesFromDefinition = e => {
  e.directives = e.directives?.filter((e => "_unmask" !== e.name.value));
};

var oe = new Set([ "populate", "client", "unmask", "_unmask", "_optional", "_relayPagination", "_simplePagination", "_required", "optional", "required", "arguments", "argumentDefinitions", "connection", "refetchable", "relay", "required", "inline" ]);

var le = 520100;

var ue = 520101;

var ce = 520102;

var fe = 520103;

var he = [ 52001, 52004, 52003, ne, le, ue, ce, fe ];

var pe = new LRUCache({
  ttl: 9e5,
  max: 5e3
});

function getGraphQLDiagnostics(e, t, i) {
  var r = i.config.templateIsCallExpression ?? !0;
  var a = getSource(i, e);
  if (!a) {
    return;
  }
  var n, s = [];
  if (r) {
    var o = findAllCallExpressions(a, i);
    s = o.fragments;
    n = o.nodes;
  } else {
    n = function findAllTaggedTemplateNodes(e) {
      var t = [];
      !function find(e) {
        if (isGraphQLTag(e) || b.isNoSubstitutionTemplateLiteral(e) && isGraphQLTag(e.parent)) {
          t.push(e);
          return;
        } else {
          b.forEachChild(e, find);
        }
      }(e);
      return t;
    }(a).map((e => ({
      node: e,
      schema: null
    })));
  }
  var l = n.map((({node: e}) => {
    if ((b.isNoSubstitutionTemplateLiteral(e) || b.isTemplateExpression(e)) && !r) {
      if (b.isTaggedTemplateExpression(e.parent)) {
        e = e.parent;
      } else {
        return;
      }
    }
    return resolveTemplate(e, 0, i).combinedText;
  }));
  var u = ae(r ? a.getText() + s.map((e => print(e))).join("-") + t.version : l.join("-") + t.version);
  var c;
  if (pe.has(u)) {
    c = pe.get(u);
  } else {
    c = runDiagnostics(a, {
      nodes: n,
      fragments: s
    }, t, i);
    pe.set(u, c);
  }
  var f = i.config.shouldCheckForColocatedFragments ?? !0;
  var h = [];
  if (r) {
    var p = findAllPersistedCallExpressions(a, i).map((t => {
      var {node: r} = t;
      if (!r.typeArguments && !r.arguments[1]) {
        return {
          category: b.DiagnosticCategory.Warning,
          code: le,
          file: a,
          messageText: "Missing generic pointing at the GraphQL document.",
          start: r.getStart(),
          length: r.getEnd() - r.getStart()
        };
      }
      var n, s, o, l, u = e;
      var c = r.typeArguments && r.typeArguments[0];
      if (c) {
        o = c.getStart();
        l = c.getEnd() - c.getStart();
        if (!b.isTypeQueryNode(c)) {
          return {
            category: b.DiagnosticCategory.Warning,
            code: le,
            file: a,
            messageText: "Provided generic should be a typeQueryNode in the shape of graphql.persisted<typeof document>.",
            start: o,
            length: l
          };
        }
        var {node: f, filename: h} = getDocumentReferenceFromTypeQuery(c, e, i);
        n = f;
        u = h;
        s = c.getText();
      } else if (r.arguments[1]) {
        o = r.arguments[1].getStart();
        l = r.arguments[1].getEnd() - r.arguments[1].getStart();
        if (!b.isIdentifier(r.arguments[1]) && !b.isCallExpression(r.arguments[1])) {
          return {
            category: b.DiagnosticCategory.Warning,
            code: le,
            file: a,
            messageText: 'Provided argument should be an identifier or invocation of "graphql" in the shape of graphql.persisted(hash, document).',
            start: o,
            length: l
          };
        }
        var {node: p, filename: d} = getDocumentReferenceFromDocumentNode(r.arguments[1], e, i);
        n = p;
        u = d;
        s = r.arguments[1].getText();
      }
      if (!n) {
        return {
          category: b.DiagnosticCategory.Warning,
          code: ce,
          file: a,
          messageText: `Can't find reference to "${s}".`,
          start: o,
          length: l
        };
      }
      var v = n;
      if (!(v && b.isCallExpression(v) && v.arguments[0] && b.isStringLiteralLike(v.arguments[0]))) {
        return {
          category: b.DiagnosticCategory.Warning,
          code: ce,
          file: a,
          messageText: `Referenced type "${s}" is not a GraphQL document.`,
          start: o,
          length: l
        };
      }
      if (!r.arguments[0]) {
        return {
          category: b.DiagnosticCategory.Warning,
          code: ue,
          file: a,
          messageText: "The call-expression is missing a hash for the persisted argument.",
          start: r.arguments.pos,
          length: r.arguments.end - r.arguments.pos
        };
      }
      var g = r.arguments[0].getText().slice(1, -1);
      if (g.startsWith("sha256:")) {
        var m = generateHashForDocument(i, v.arguments[0], u, v.arguments[1] && b.isArrayLiteralExpression(v.arguments[1]) ? v.arguments[1] : void 0);
        if (!m) {
          return null;
        }
        if (`sha256:${m}` !== g) {
          return {
            category: b.DiagnosticCategory.Warning,
            code: fe,
            file: a,
            messageText: "The persisted document's hash is outdated",
            start: r.arguments.pos,
            length: r.arguments.end - r.arguments.pos
          };
        }
      }
      return null;
    })).filter(Boolean);
    c.push(...p);
  }
  if (r && f) {
    var d = getColocatedFragmentNames(a, i);
    var v = new Set;
    n.forEach((({node: e}) => {
      try {
        var t = y(e.getText().slice(1, -1), {
          noLocation: !0
        });
        E(t, {
          FragmentSpread: e => {
            v.add(e.name.value);
          }
        });
      } catch (e) {}
    }));
    Object.keys(d).forEach((e => {
      var {fragments: t, start: i, length: r} = d[e];
      var n = Array.from(new Set(t.filter((e => !v.has(e)))));
      if (n.length) {
        h.push({
          file: a,
          length: r,
          start: i,
          category: b.DiagnosticCategory.Warning,
          code: 52003,
          messageText: `Unused co-located fragment definition(s) "${n.join(", ")}" in ${e}`
        });
      }
    }));
    return [ ...c, ...h ];
  } else {
    return c;
  }
}

var runDiagnostics = (t, {nodes: i, fragments: r}, a, n) => {
  var s = n.config.templateIsCallExpression ?? !0;
  var o = i.map((t => {
    var i = t.node;
    if (!s && (b.isNoSubstitutionTemplateLiteral(i) || b.isTemplateExpression(i))) {
      if (b.isTaggedTemplateExpression(i.parent)) {
        i = i.parent;
      } else {
        return;
      }
    }
    var {combinedText: o, resolvedSpans: l} = resolveTemplate(i, 0, n);
    var u = o.split("\n");
    var c = !1;
    if (b.isAsExpression(i.parent)) {
      if (b.isExpressionStatement(i.parent.parent)) {
        c = !0;
      }
    } else if (b.isExpressionStatement(i.parent)) {
      c = !0;
    }
    var f = i.getStart() + (s ? 0 : i.tag.getText().length + (c ? 2 : 0));
    var h = f + i.getText().length;
    var p = [ ...r ];
    if (s) {
      try {
        var d = y(o, {
          noLocation: !0
        }).definitions.filter((t => t.kind === e.FRAGMENT_DEFINITION));
        p = p.filter((t => !d.some((i => i.kind === e.FRAGMENT_DEFINITION && i.name.value === t.name.value))));
      } catch (e) {}
    }
    var v = t.schema && a.multi[t.schema] ? a.multi[t.schema]?.schema : a.current?.schema;
    if (!v) {
      return;
    }
    var g = new Set([ ...oe, ...n.config.clientDirectives || [] ]);
    var m = getDiagnostics(o, v, void 0, void 0, p).filter((e => {
      if (!e.message.includes("Unknown directive")) {
        return !0;
      }
      var [t] = e.message.split("(");
      var i = t && /Unknown directive "@([^)]+)"/g.exec(t);
      if (!i) {
        return !0;
      }
      var r = i[1];
      return r && !g.has(r);
    })).map((e => {
      var {start: t, end: i} = e.range;
      var r = f + t.line;
      for (var a = 0; a <= t.line && a < u.length; a++) {
        if (a === t.line) {
          r += t.character;
        } else if (u[a]) {
          r += u[a].length;
        }
      }
      var n = f + i.line;
      for (var s = 0; s <= i.line && s < u.length; s++) {
        if (s === i.line) {
          n += i.character;
        } else if (u[s]) {
          n += u[s].length;
        }
      }
      var o = l.find((e => r >= e.new.start && n <= e.new.start + e.new.length));
      if (o) {
        return {
          ...e,
          start: o.original.start,
          length: o.original.length
        };
      } else if (r > h) {
        var c = l.filter((e => e.new.start + e.new.length < r)).reduce(((e, t) => e + (t.new.length - t.original.length)), 0);
        r -= c;
        n -= c;
        return {
          ...e,
          start: r + 1,
          length: n - r
        };
      } else {
        return {
          ...e,
          start: r + 1,
          length: n - r
        };
      }
    })).filter((e => e.start + e.length <= h));
    return m;
  })).flat().filter(Boolean);
  var l = o.map((e => ({
    file: t,
    length: e.length,
    start: e.start,
    category: 2 === e.severity ? b.DiagnosticCategory.Warning : b.DiagnosticCategory.Error,
    code: "number" == typeof e.code ? e.code : 2 === e.severity ? 52004 : 52001,
    messageText: e.message.split("\n")[0]
  })));
  if (s) {
    var u = ((e, t, i) => {
      var r = [];
      if (!(i.config.trackFieldUsage ?? 1)) {
        return r;
      }
      var a = new Set([ "id", "_id", "__typename", ...i.config.reservedKeys ?? [] ]);
      var n = i.languageService.getProgram()?.getTypeChecker();
      if (!n) {
        return;
      }
      try {
        t.forEach((t => {
          var s = t.getText();
          if (s.includes("mutation") || s.includes("subscription")) {
            return;
          }
          var o = getVariableDeclaration(t);
          if (!o) {
            return;
          }
          var l;
          var u = n.getTypeAtLocation(t.parent);
          if ("target" in u) {
            var c = u.resolvedTypeArguments;
            l = c && c.length > 1 ? c[0] : void 0;
          }
          if (!l) {
            var f = u.getProperty("__apiType");
            if (f) {
              var h = n.getTypeOfSymbol(f);
              var p = u.getCallSignatures()[0];
              if (h.isUnionOrIntersection()) {
                for (var d of h.types) {
                  if (p = d.getCallSignatures()[0]) {
                    l = p.getReturnType();
                    break;
                  }
                }
              }
              l = p && p.getReturnType();
            }
          }
          var v = i.languageService.getReferencesAtPosition(e.fileName, o.name.getStart());
          if (!v) {
            return;
          }
          var g = [];
          var m = [];
          var S = [];
          var x = new Map;
          E(y(t.getText().slice(1, -1)), {
            Field: {
              enter(e) {
                var t = e.alias ? e.alias.value : e.name.value;
                var i = m.length ? `${m.join(".")}.${t}` : t;
                if (!e.selectionSet && !a.has(e.name.value)) {
                  S.push(i);
                  x.set(i, {
                    start: e.name.loc.start,
                    length: e.name.loc.end - e.name.loc.start
                  });
                } else if (e.selectionSet) {
                  m.push(t);
                  x.set(i, {
                    start: e.name.loc.start,
                    length: e.name.loc.end - e.name.loc.start
                  });
                }
              },
              leave(e) {
                if (e.selectionSet) {
                  m.pop();
                }
              }
            }
          });
          v.forEach((t => {
            if (t.fileName !== e.fileName) {
              return;
            }
            var r = findNode(e, t.textSpan.start);
            if (!r) {
              return;
            }
            if (r.parent === o) {
              return;
            }
            var a = n.getSymbolsInScope(r, b.SymbolFlags.BlockScopedVariable);
            var s;
            for (var u of a) {
              if (!u.valueDeclaration) {
                continue;
              }
              var c = unwrapAbstractType(n.getTypeOfSymbol(u));
              if (l === c) {
                s = u;
                break;
              }
              if (c.flags & b.TypeFlags.Object) {
                var f = c.getProperty("0");
                if (f) {
                  c = n.getTypeOfSymbol(f);
                  if (l === c) {
                    s = u;
                    break;
                  }
                }
                var h = c.getProperty("data");
                if (h) {
                  c = unwrapAbstractType(n.getTypeOfSymbol(h));
                  if (l === c) {
                    s = u;
                    break;
                  }
                }
              }
            }
            var p = s?.valueDeclaration;
            var d;
            if (p && "name" in p && p.name && (b.isIdentifier(p.name) || b.isBindingName(p.name))) {
              d = p.name;
            } else {
              var v = getVariableDeclaration(r);
              if (v) {
                d = v.name;
              }
            }
            if (d) {
              var m = crawlScope(d, [], S, e, i, !1);
              g.push(...m);
            }
          }));
          if (!g.length) {
            return;
          }
          var T = S.filter((e => !g.includes(e)));
          var A = new Set;
          var w = {};
          var D = new Set;
          T.forEach((e => {
            var t = e.split(".");
            t.pop();
            var i = t.join(".");
            if (x.get(i)) {
              A.add(i);
              if (w[i]) {
                w[i].add(e);
              } else {
                w[i] = new Set([ e ]);
              }
            } else {
              D.add(e);
            }
          }));
          A.forEach((i => {
            var a = x.get(i);
            var n = w[i];
            r.push({
              file: e,
              length: a.length,
              start: t.getStart() + a.start + 1,
              category: b.DiagnosticCategory.Warning,
              code: ne,
              messageText: `Field(s) ${[ ...n ].map((e => `'${e}'`)).join(", ")} are not used.`
            });
          }));
          D.forEach((i => {
            var a = x.get(i);
            r.push({
              file: e,
              length: a.length,
              start: t.getStart() + a.start + 1,
              category: b.DiagnosticCategory.Warning,
              code: ne,
              messageText: `Field ${i} is not used.`
            });
          }));
        }));
      } catch (e) {
        console.error("[GraphQLSP]: ", e.message, e.stack);
      }
      return r;
    })(t, i.map((e => e.node)), n) || [];
    if (!u) {
      return l;
    }
    return [ ...l, ...u ];
  } else {
    return l;
  }
};

export { he as A, CharacterStream as C, bubbleUpTemplate as a, bubbleUpCallExpression as b, getSchemaName as c, getAllFragments as d, isGraphQLTag as e, findNode as f, getSource as g, init as h, isGraphQLCall as i, q as j, getGraphQLDiagnostics as k, getPersistedCodeFixAtPosition as l, findAllPersistedCallExpressions as m, findAllCallExpressions as n, onlineParser as o, print as p, getDocumentReferenceFromTypeQuery as q, resolveTemplate as r, getDocumentReferenceFromDocumentNode as s, b as t, unrollTadaFragments as u };
//# sourceMappingURL=api-chunk.mjs.map
