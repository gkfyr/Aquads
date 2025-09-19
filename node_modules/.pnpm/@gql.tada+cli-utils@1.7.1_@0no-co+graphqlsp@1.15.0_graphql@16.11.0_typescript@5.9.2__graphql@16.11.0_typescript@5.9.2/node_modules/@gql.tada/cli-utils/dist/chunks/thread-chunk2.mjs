import e from "typescript";

import * as r from "node:path";

import { getSchemaNamesFromConfig as a } from "@gql.tada/internal";

import { findAllCallExpressions as t } from "@0no-co/graphqlsp/api";

import { e as i } from "./index-chunk2.mjs";

import { p as o } from "./index-chunk.mjs";

function traceCallToImportSource(r, a, t) {
  var i = t.getTypeChecker();
  var o = r.expression;
  var n;
  if (e.isIdentifier(o)) {
    n = o;
  } else if (e.isPropertyAccessExpression(o) && e.isIdentifier(o.expression)) {
    n = o.expression;
  }
  if (!n) {
    return;
  }
  var s = i.getSymbolAtLocation(n);
  if (!s || !s.declarations) {
    return;
  }
  for (var l of s.declarations) {
    var u = findImportDeclaration(l);
    if (u && e.isStringLiteral(u.moduleSpecifier)) {
      return resolveModulePath(u.moduleSpecifier.text, a, t);
    }
  }
  return;
}

function findImportDeclaration(r) {
  var a = r;
  while (a) {
    if (e.isImportDeclaration(a)) {
      return a;
    }
    a = a.parent;
  }
  return;
}

function resolveModulePath(r, a, t) {
  var i = t.getCompilerOptions();
  var o = e.createCompilerHost(i);
  var n = e.resolveModuleName(r, a.fileName, i, o);
  if (n.resolvedModule) {
    return n.resolvedModule.resolvedFileName;
  }
  return;
}

function collectImportsFromSourceFile(a, t, i, o) {
  var n = [];
  var s = function getTadaOutputPaths(e) {
    var r = [];
    if ("schema" in e && e.tadaOutputLocation) {
      r.push(e.tadaOutputLocation);
    }
    return r;
  }(t);
  !function visit(t) {
    if (e.isImportDeclaration(t) && e.isStringLiteral(t.moduleSpecifier)) {
      var l = t.moduleSpecifier.text;
      if (!function isTadaImport(e, a, t) {
        if (e.startsWith(".")) {
          var i = r.dirname(a);
          var o = r.resolve(i, e);
          return t.some((e => {
            var a = r.resolve(e);
            return o === a || o.startsWith(a + r.sep);
          }));
        }
        return t.some((r => e === r || e.startsWith(r + "/")));
      }(l, a.fileName, s)) {
        var u = t.getFullText().trim();
        if (o) {
          var c = i(l, a.fileName, o).replace(/\.ts$/, "").replace(/\.tsx$/, "");
          if (c && !c.includes("gql.tada")) {
            n.push({
              specifier: c,
              importClause: u.replace(l, c)
            });
          }
        } else {
          n.push({
            specifier: l,
            importClause: u
          });
        }
      }
    }
    e.forEachChild(t, visit);
  }(a);
  return n;
}

var n = i((async function* _runTurbo(r) {
  var i = a(r.pluginConfig);
  var n = o(r);
  n.addSourceFile({
    fileId: "__gql-tada-override__.d.ts",
    sourceText: l,
    scriptKind: e.ScriptKind.TS
  });
  var u = n.createExternalFiles();
  if (u.length) {
    yield {
      kind: "EXTERNAL_WARNING"
    };
    await n.addVirtualFiles(u);
  }
  var c = n.build();
  var p = c.buildPluginInfo(r.pluginConfig);
  var m = c.getSourceFiles();
  yield {
    kind: "FILE_COUNT",
    fileCount: m.length
  };
  var f = c.program.getTypeChecker();
  var d = new Map;
  for (var v of m) {
    var g = v.fileName;
    var h = [];
    var y = [];
    var T = t(v, p, !1).nodes;
    var _loop = async function*(a) {
      var t = a.node.parent;
      if (!e.isCallExpression(t)) {
        return 0;
      }
      var o = c.getSourcePosition(v, t.getStart());
      g = o.fileName;
      if (!i.has(a.schema)) {
        y.push({
          message: a.schema ? `The '${a.schema}' schema is not in the configuration but was referenced by document.` : i.size > 1 ? "The document is not for a known schema. Have you re-generated the output file?" : "Multiple schemas are configured, but the document is not for a specific schema.",
          file: o.fileName,
          line: o.line,
          col: o.col
        });
        return 0;
      }
      var l = traceCallToImportSource(t, v, c.program);
      if (l && !d.has(l)) {
        var u = c.program.getSourceFile(l);
        if (u) {
          var p = Array.isArray(r.turboOutputPath) ? r.turboOutputPath.find((e => e.schemaName === a.schema))?.path : r.turboOutputPath;
          var m = collectImportsFromSourceFile(u, r.pluginConfig, n.resolveModuleName.bind(n), p);
          d.set(l, {
            absolutePath: l,
            imports: m
          });
        }
      }
      var T = f.getTypeAtLocation(t);
      var F = f.getTypeAtLocation(a.node);
      if (!T.symbol || "TadaDocumentNode" !== T.symbol.getEscapedName()) {
        y.push({
          message: 'The discovered document is not of type "TadaDocumentNode".\nIf this is unexpected, please file an issue describing your case.',
          file: o.fileName,
          line: o.line,
          col: o.col
        });
        return 0;
      }
      var S = "value" in F && "string" == typeof F.value && !(F.flags & e.TypeFlags.StringLiteral) ? JSON.stringify(F.value) : f.typeToString(F, t, s);
      var N = f.typeToString(T, t, s);
      h.push({
        schemaName: a.schema,
        argumentKey: S,
        documentType: N
      });
    };
    for (var F of T) {
      if (0 === (yield* _loop(F))) {
        continue;
      }
    }
    yield {
      kind: "FILE_TURBO",
      filePath: g,
      documents: h,
      warnings: y
    };
  }
  if (d.size > 0) {
    yield {
      kind: "GRAPHQL_SOURCES",
      sources: Array.from(d.values())
    };
  }
}));

var s = e.TypeFormatFlags.NoTruncation | e.TypeFormatFlags.NoTypeReduction | e.TypeFormatFlags.InTypeAlias | e.TypeFormatFlags.UseFullyQualifiedType | e.TypeFormatFlags.GenerateNamesForShadowedTypeParams | e.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | e.TypeFormatFlags.AllowUniqueESSymbolType | e.TypeFormatFlags.WriteTypeArgumentsOfSignature;

var l = "\nimport * as _gqlTada from 'gql.tada';\ndeclare module 'gql.tada' {\n  interface setupCache {\n    readonly __cacheDisabled: true;\n  }\n}\n".trim();

export { n as runTurbo };
//# sourceMappingURL=thread-chunk2.mjs.map
