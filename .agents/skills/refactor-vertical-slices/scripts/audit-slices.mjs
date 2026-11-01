#!/usr/bin/env node
// Mechanical architecture audit for NestJS vertical slices.
// Dependency-free on purpose: subagents must be able to run it before installing anything.
//
// Usage:
//   node .agents/skills/refactor-vertical-slices/scripts/audit-slices.mjs \
//     --root apps/api/src/modules \
//     --json .refactor/<run>/audit.json \
//     --md   .refactor/<run>/audit.md
//
// Exit codes: 0 = no blocker/major, 1 = at least one blocker/major, 2 = invalid input.

import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LAYERS = new Set([
  "domain",
  "application",
  "infrastructure",
  "interface",
]);
const ROUTE_DECORATORS = [
  "Get",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "Options",
  "Head",
];
const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2, info: 3 };
const SEVERITY_LABEL = {
  blocker: "BLOQUEADOR",
  major: "MAJOR",
  minor: "MENOR",
  info: "INFO",
};

function parseArgs(argv) {
  const args = {
    root: "apps/api/src/modules",
    json: null,
    md: null,
    includeMinor: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--root":
        args.root = next;
        i += 1;
        break;
      case "--json":
        args.json = next;
        i += 1;
        break;
      case "--md":
        args.md = next;
        i += 1;
        break;
      case "--no-minor":
        args.includeMinor = false;
        break;
      case "--help":
      case "-h":
        console.log(
          [
            "audit-slices.mjs --root <dir> [--json <file>] [--md <file>] [--no-minor]",
            "",
            "Scans NestJS vertical slices for layer, dependency, handler/use-case and test violations.",
          ].join("\n"),
        );
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(2);
        }
    }
  }

  return args;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name.startsWith(".")
      ) {
        continue;
      }
      files.push(...(await walk(full)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }

  return files;
}

async function buildTestCorpus(srcDir) {
  try {
    const files = await walk(srcDir);
    const testFiles = files.filter((file) => /\.(test|spec)\.ts$/.test(file));
    const contents = await Promise.all(
      testFiles.map((file) => readFile(file, "utf8").catch(() => "")),
    );
    return contents.join("\n");
  } catch {
    return "";
  }
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function extractImports(content) {
  const imports = [];
  const regex = /\bfrom\s+["']([^"']+)["']/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    imports.push({ specifier: match[1], index: match.index });
  }

  return imports;
}

function classifySpecifier({ specifier, fromFile, moduleDir, rootDir }) {
  if (specifier.startsWith(".")) {
    const target = path.resolve(path.dirname(fromFile), specifier);
    const relativeToModule = path.relative(moduleDir, target);

    if (
      !relativeToModule.startsWith("..") &&
      !path.isAbsolute(relativeToModule)
    ) {
      const segments = relativeToModule.split(path.sep);
      return {
        kind: "module",
        layer: LAYERS.has(segments[0]) ? segments[0] : "root",
        slice: path.basename(moduleDir),
        target,
      };
    }

    const relativeToRoot = path.relative(rootDir, target);
    if (!relativeToRoot.startsWith("..") && !path.isAbsolute(relativeToRoot)) {
      const segments = relativeToRoot.split(path.sep);
      return {
        kind: "slice",
        layer: LAYERS.has(segments[1]) ? segments[1] : "root",
        slice: segments[0],
        target,
      };
    }

    return { kind: "outside", layer: null, slice: null, target };
  }

  if (specifier.startsWith("node:")) {
    return { kind: "runtime", layer: null, slice: null };
  }

  if (
    specifier.startsWith("src/") ||
    specifier.startsWith("shared/") ||
    specifier.includes("shared/")
  ) {
    return { kind: "shared", layer: null, slice: null };
  }

  return { kind: "external", layer: null, slice: null };
}

function parseClassNames(content) {
  const names = [];
  const regex = /\bexport\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    names.push(match[1]);
  }

  return names;
}

function splitTopLevel(value, separator) {
  const parts = [];
  let depth = 0;
  let current = "";

  for (const char of value) {
    if ("(<{[".includes(char)) {
      depth += 1;
    } else if (")>}]".includes(char)) {
      depth -= 1;
    }

    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function parseConstructorDependencies(content) {
  const marker = "constructor(";
  const start = content.indexOf(marker);

  if (start === -1) {
    return [];
  }

  let depth = 0;
  let end = content.length;

  for (let i = start + marker.length - 1; i < content.length; i += 1) {
    if (content[i] === "(") {
      depth += 1;
    } else if (content[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const body = content.slice(start + marker.length, end);

  return splitTopLevel(body, ",")
    .map((parameter) => {
      const cleaned = parameter.replace(/@[A-Za-z0-9_]+\([^)]*\)/g, "").trim();
      const match = cleaned.match(
        /^(?:(?:private|public|protected)\s+)?(?:readonly\s+)?([A-Za-z0-9_]+)\??\s*:\s*([\s\S]+)$/,
      );

      if (!match) {
        return null;
      }

      return {
        name: match[1],
        type: match[2].split("=")[0].replace(/\s+/g, " ").trim(),
      };
    })
    .filter(Boolean);
}

function hasNamedNestException(content) {
  return /\b(HttpException|BadRequestException|UnauthorizedException|ForbiddenException|NotFoundException|ConflictException|InternalServerErrorException|ServiceUnavailableException)\b/.test(
    content,
  );
}

function createFinding({ rule, severity, title, detail, hint, file, line }) {
  return { rule, severity, title, detail, hint, file, line };
}

function isTestFile(file) {
  return /\.(test|spec)\.ts$/.test(file);
}

function isHandlerFile(file) {
  return /\.(handler|controller)\.ts$/.test(file) && !isTestFile(file);
}

function isUseCaseFile(file) {
  return /\.use-case\.ts$/.test(file) && !isTestFile(file);
}

function isGuardFile(file) {
  return /\.guard\.ts$/.test(file) || /guard\.ts$/.test(file);
}

function isDtoFile(file) {
  return toPosix(file).includes("/dto/") || /\.dto\.ts$/.test(file);
}

async function analyzeSlice({ sliceDir, rootDir, testCorpus }) {
  const slice = path.basename(sliceDir);
  const findings = [];
  const files = (await walk(sliceDir)).filter((file) => !isTestFile(file));
  const testFiles = new Set(
    (await walk(sliceDir)).filter((file) => isTestFile(file)).map(toPosix),
  );
  const layers = {
    domain: [],
    application: [],
    infrastructure: [],
    interface: [],
    root: [],
  };
  const handlerClasses = [];
  const useCaseClasses = [];

  for (const file of files) {
    const rel = path.relative(sliceDir, file);
    const segments = rel.split(path.sep);
    const layer = LAYERS.has(segments[0]) ? segments[0] : "root";
    const content = await readFile(file, "utf8");
    const display = toPosix(path.relative(rootDir, file));
    layers[layer].push(display);

    const inTestingFolder = segments[0] === "testing";
    if (
      layer === "root" &&
      !inTestingFolder &&
      !/\.module\.ts$/.test(file) &&
      !/\.tokens\.ts$/.test(file)
    ) {
      findings.push(
        createFinding({
          rule: "ARCH-01",
          severity: "minor",
          title: "Arquivo fora de camada no root da slice",
          detail: `"${display}" não é module nem tokens e vive no root da slice.`,
          hint: "Mova para domain/application/infrastructure/interface; o root guarda apenas composition root e tokens.",
          file: display,
        }),
      );
    }

    for (const imported of extractImports(content)) {
      const target = classifySpecifier({
        specifier: imported.specifier,
        fromFile: file,
        moduleDir: sliceDir,
        rootDir,
      });
      const line = content.slice(0, imported.index).split("\n").length;
      const where = `${display}:${line}`;

      if (layer === "domain") {
        if (target.kind !== "module" || target.layer !== "domain") {
          findings.push(
            createFinding({
              rule: "DEP-01",
              severity: "blocker",
              title: "domain depende de fora do domínio",
              detail: `"${display}" importa "${imported.specifier}" (${target.kind}/${target.layer ?? "n/a"}).`,
              hint: "domain deve ser puro: só arquivos do próprio domain. Portas ficam aqui; I/O fica em infrastructure.",
              file: display,
              line,
            }),
          );
        }
        continue;
      }

      if (target.kind === "slice" && target.slice !== slice) {
        findings.push(
          createFinding({
            rule: "SLICE-01",
            severity: "blocker",
            title: "Import entre slices",
            detail: `"${where}" importa a slice "${target.slice}" diretamente.`,
            hint: "Use uma porta/API pública exportada pelo módulo da outra slice ou mova o código para src/shared.",
            file: display,
            line,
          }),
        );
        continue;
      }

      if (layer === "application") {
        if (target.kind === "module" && target.layer === "infrastructure") {
          findings.push(
            createFinding({
              rule: "DEP-02",
              severity: "blocker",
              title: "application depende de infrastructure",
              detail: `"${where}" importa infrastructure.`,
              hint: "Inverta a dependência: declare a porta em domain e injete o token; quem implementa é infrastructure.",
              file: display,
              line,
            }),
          );
        }
        if (target.kind === "module" && target.layer === "interface") {
          findings.push(
            createFinding({
              rule: "DEP-03",
              severity: "blocker",
              title: "application depende de interface",
              detail: `"${where}" importa interface.`,
              hint: "Use cases não conhecem HTTP/DTO. Entrada e saída são tipos do próprio use case.",
              file: display,
              line,
            }),
          );
        }
        if (
          target.kind === "external" &&
          imported.specifier !== "@nestjs/common" &&
          !isTestUtility(imported.specifier)
        ) {
          findings.push(
            createFinding({
              rule: "DEP-04",
              severity: "minor",
              title: "Dependência externa na application",
              detail: `"${where}" importa "${imported.specifier}".`,
              hint: "Se for I/O, vira porta em domain. Para @nestjs/common, apenas Injectable/Logger são tolerados pela convenção atual.",
              file: display,
              line,
            }),
          );
        }
      }

      if (layer === "infrastructure") {
        if (target.kind === "module" && target.layer === "application") {
          findings.push(
            createFinding({
              rule: "DEP-05",
              severity: "blocker",
              title: "infrastructure depende de application",
              detail: `"${where}" importa application.`,
              hint: "Adapter implementa porta de domain; jamais chama use case.",
              file: display,
              line,
            }),
          );
        }
        if (target.kind === "module" && target.layer === "interface") {
          findings.push(
            createFinding({
              rule: "DEP-06",
              severity: "blocker",
              title: "infrastructure depende de interface",
              detail: `"${where}" importa interface.`,
              hint: "Camadas externas apontam para dentro. Interface não é dependência de adapter.",
              file: display,
              line,
            }),
          );
        }
      }

      if (layer === "interface") {
        if (target.kind === "module" && target.layer === "infrastructure") {
          findings.push(
            createFinding({
              rule: "DEP-07",
              severity: "blocker",
              title: "interface depende de infrastructure",
              detail: `"${where}" importa infrastructure.`,
              hint: "O handler conversa com o use case. Se precisar de repositório, o fluxo ainda não virou use case.",
              file: display,
              line,
            }),
          );
        }
        if (
          target.kind === "module" &&
          target.layer === "domain" &&
          !isDtoFile(file)
        ) {
          findings.push(
            createFinding({
              rule: "DEP-08",
              severity: "minor",
              title: "interface importa domain diretamente",
              detail: `"${where}" importa domain.`,
              hint: "Permitido apenas para mapear tipos/erros de domínio para HTTP; não injete repositórios nem chame serviços de domínio.",
              file: display,
              line,
            }),
          );
        }
        if (
          target.kind === "module" &&
          target.layer === "interface" &&
          /\.(handler|controller)\.ts$/.test(imported.specifier)
        ) {
          findings.push(
            createFinding({
              rule: "DEP-09",
              severity: "major",
              title: "Handler importa outro handler",
              detail: `"${where}" importa "${imported.specifier}".`,
              hint: "Extraia a constante/utilitário para um arquivo próprio da interface ou para o use case.",
              file: display,
              line,
            }),
          );
        }
      }
    }

    const classes = parseClassNames(content);
    const fileName = path.basename(file);

    if (layer === "interface" && isHandlerFile(file)) {
      const controllerCount = (content.match(/@Controller\s*\(/g) ?? []).length;
      const routeCount = (
        content.match(
          new RegExp(`@(?:${ROUTE_DECORATORS.join("|")})\\s*\\(`, "g"),
        ) ?? []
      ).length;
      const deps = parseConstructorDependencies(content);
      const useCases = deps.filter((dep) => /UseCase\b/.test(dep.type));
      const extraDeps = deps.filter((dep) => !/UseCase\b/.test(dep.type));

      if (fileName.endsWith(".controller.ts")) {
        findings.push(
          createFinding({
            rule: "IF-01",
            severity: "major",
            title: "Handler com nome legado",
            detail: `"${display}" ainda usa o sufixo .controller.ts.`,
            hint: "No contrato alvo o arquivo é {ação}.handler.ts e a classe é {Ação}Handler.",
            file: display,
          }),
        );
      }

      if (controllerCount > 1) {
        findings.push(
          createFinding({
            rule: "IF-02",
            severity: "blocker",
            title: "Mais de um @Controller no mesmo arquivo",
            detail: `"${display}" declara ${controllerCount} controllers.`,
            hint: "Um arquivo, uma classe, um endpoint.",
            file: display,
          }),
        );
      }

      if (routeCount !== 1) {
        findings.push(
          createFinding({
            rule: "IF-03",
            severity: routeCount === 0 ? "blocker" : "major",
            title: "Handler não tem exatamente um endpoint",
            detail: `"${display}" declara ${routeCount} decorators de rota HTTP.`,
            hint: "Cada request handler expõe exatamente uma rota; split por ação.",
            file: display,
          }),
        );
      }

      if (useCases.length !== 1) {
        findings.push(
          createFinding({
            rule: "UC-01",
            severity: "blocker",
            title: "Handler não tem exatamente um use case",
            detail: `"${display}" injeta ${useCases.length} use case(s): ${useCases.map((d) => d.type).join(", ") || "nenhum"}.`,
            hint: "O relacionamento handler → use case é 1:1. Se o fluxo ainda não existe, crie o use case antes do handler.",
            file: display,
          }),
        );
      }

      if (extraDeps.length > 0) {
        findings.push(
          createFinding({
            rule: "UC-02",
            severity: "blocker",
            title: "Handler injeta dependência além do use case",
            detail: `"${display}" injeta: ${extraDeps.map((d) => `${d.name}: ${d.type}`).join(", ")}.`,
            hint: "O handler só conhece o use case. Métricas, logging, repositórios e serviços pertencem ao use case ou a um interceptor/guard do Nest.",
            file: display,
          }),
        );
      }

      for (const className of classes) {
        if (!className.endsWith("Handler")) {
          findings.push(
            createFinding({
              rule: "IF-04",
              severity: "minor",
              title: "Classe de handler fora do padrão de nome",
              detail: `"${display}" exporta "${className}".`,
              hint: "Use o sufixo Handler (ex.: SignInHandler).",
              file: display,
            }),
          );
        }
        handlerClasses.push(className);
      }

      const routeMethod = content.match(
        new RegExp(
          `@(?:${ROUTE_DECORATORS.join("|")})\\s*\\([^)]*\\)\\s*(?:(?:@[^\\n]+\\n)\\s*)?(?:async\\s+)?([A-Za-z0-9_]+)\\s*\\(`,
        ),
      );
      if (routeMethod && routeMethod[1] !== "execute") {
        findings.push(
          createFinding({
            rule: "IF-05",
            severity: "info",
            title: "Método do endpoint não se chama execute",
            detail: `"${display}" expõe "${routeMethod[1]}()".`,
            hint: "Convenção: execute() é o único ponto de entrada do handler.",
            file: display,
          }),
        );
      }
    }

    if (layer === "application" && isUseCaseFile(file)) {
      const useCasesInFile = classes.filter((name) => name.endsWith("UseCase"));
      useCaseClasses.push(...useCasesInFile);

      if (useCasesInFile.length !== 1) {
        findings.push(
          createFinding({
            rule: "UC-03",
            severity: "blocker",
            title: "Arquivo de use case sem exatamente uma classe",
            detail: `"${display}" exporta ${useCasesInFile.length} classes *UseCase.`,
            hint: "Um fluxo por classe/arquivo. Serviços compartilhados podem viver na application, mas não são use cases.",
            file: display,
          }),
        );
      }

      if (!/\bexecute\s*\(/.test(content)) {
        findings.push(
          createFinding({
            rule: "UC-04",
            severity: "major",
            title: "Use case sem método execute",
            detail: `"${display}" não declara execute().`,
            hint: "Todo fluxo expõe execute(input): Promise<output>.",
            file: display,
          }),
        );
      }

      if (hasNamedNestException(content)) {
        findings.push(
          createFinding({
            rule: "UC-05",
            severity: "blocker",
            title: "Use case lança exceção HTTP",
            detail: `"${display}" usa exceção do Nest.`,
            hint: "Use case lança erro de domínio; o handler traduz para HTTP.",
            file: display,
          }),
        );
      }

      if (/@(Controller|Body|Req|Res|Query|Param)\s*\(/.test(content)) {
        findings.push(
          createFinding({
            rule: "UC-06",
            severity: "blocker",
            title: "Use case acoplado a HTTP",
            detail: `"${display}" usa decorators de transporte.`,
            hint: "Entrada/saída do use case são tipos próprios, sem depender de HTTP.",
            file: display,
          }),
        );
      }

      const companion = [...testFiles].find((test) =>
        test.endsWith(`${toPosix(file).replace(/\.ts$/, ".test.ts")}`),
      );
      if (!companion) {
        findings.push(
          createFinding({
            rule: "TEST-01",
            severity: "major",
            title: "Use case sem teste unitário",
            detail: `"${display}" não tem "${path.basename(file).replace(/\.ts$/, ".test.ts")}".`,
            hint: "Cubra o fluxo com repositórios/fakes antes de refatorar o handler.",
            file: display,
          }),
        );
      }
    }

    if (layer === "application" && !isUseCaseFile(file)) {
      for (const className of classes.filter((name) =>
        name.endsWith("UseCase"),
      )) {
        findings.push(
          createFinding({
            rule: "UC-07",
            severity: "major",
            title: "Use case fora do padrão de arquivo",
            detail: `"${display}" exporta "${className}" fora de *.use-case.ts.`,
            hint: "Renomeie para {fluxo}.use-case.ts para que o fluxo seja localizável.",
            file: display,
          }),
        );
      }
    }

    if (layer === "infrastructure") {
      const implementsPort = /\bimplements\s+[A-Za-z0-9_,\s]+/.test(content);
      const isModuleOrFactory =
        /@Module\s*\(/.test(content) ||
        /\buseFactory\b/.test(content) ||
        /\.module\.ts$/.test(file);
      if (classes.length > 0 && !implementsPort && !isModuleOrFactory) {
        findings.push(
          createFinding({
            rule: "PORT-01",
            severity: "info",
            title: "Adapter sem implements explícito",
            detail: `"${display}" não declara implements de uma porta de domínio.`,
            hint: "Quando a classe é um adapter de porta, implemente a interface de domain para o compilador cobrar o contrato.",
            file: display,
          }),
        );
      }
    }

    if (layer === "interface" && isHandlerFile(file) && classes.length > 0) {
      const expectedTest = file.replace(/\.ts$/, ".test.ts");
      const stem = path
        .basename(file)
        .replace(/\.(handler|controller)\.ts$/, "");
      const coveredElsewhere = new RegExp(
        `\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      ).test(testCorpus);
      if (!testFiles.has(toPosix(expectedTest)) && !coveredElsewhere) {
        findings.push(
          createFinding({
            rule: "TEST-02",
            severity: "major",
            title: "Handler sem teste de integração",
            detail: `"${display}" não tem teste HTTP correspondente.`,
            hint: "Cubra status, contrato de erro e validação do endpoint antes/depois do split.",
            file: display,
          }),
        );
      }
    }
  }

  const moduleFile = files.find((file) => /\.module\.ts$/.test(file));
  if (moduleFile) {
    const moduleContent = await readFile(moduleFile, "utf8");
    const moduleDisplay = toPosix(path.relative(rootDir, moduleFile));

    for (const className of [...handlerClasses, ...useCaseClasses]) {
      if (!new RegExp(`\\b${className}\\b`).test(moduleContent)) {
        findings.push(
          createFinding({
            rule: "WIRE-01",
            severity: "major",
            title: "Classe não registrada no módulo",
            detail: `"${className}" existe em "${slice}" mas não aparece em "${moduleDisplay}".`,
            hint: "Registre handlers em controllers e use cases em providers; sem isso a rota/DI não sobe.",
            file: moduleDisplay,
          }),
        );
      }
    }
  } else {
    findings.push(
      createFinding({
        rule: "WIRE-02",
        severity: "blocker",
        title: "Slice sem módulo Nest",
        detail: `"${slice}" não tem arquivo *.module.ts no root.`,
        hint: "Toda slice precisa de composition root que registre handlers, use cases e adapters.",
        file: toPosix(path.relative(rootDir, sliceDir)),
      }),
    );
  }

  return { name: slice, layers, findings: dedupeFindings(findings) };
}

function dedupeFindings(findings) {
  const seen = new Set();
  // Noise-only rules are collapsed per file; class/import-level rules keep every
  // finding so a handler with two handlers or four imports stays visible.
  const collapsePerFile = new Set(["DEP-08", "IF-04"]);

  return findings.filter((finding) => {
    if (!collapsePerFile.has(finding.rule)) {
      return true;
    }

    const key = `${finding.rule}|${finding.file}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isTestUtility(specifier) {
  return specifier.startsWith("vitest") || specifier.startsWith("@vitest/");
}

function renderMarkdown(result) {
  const lines = [];
  lines.push("# Auditoria de vertical slices — arquitetura em camadas");
  lines.push("");
  lines.push(`- Root: \`${result.root}\``);
  lines.push(`- Gerado em: ${result.generatedAt}`);
  lines.push(
    `- Slices: ${result.summary.slices} | Arquivos: ${result.summary.files} | Bloqueadores: ${result.summary.blocker} | Majoritários: ${result.summary.major} | Menores: ${result.summary.minor} | Info: ${result.summary.info}`,
  );
  lines.push("");
  lines.push(
    "> O script é heurístico. Confirme cada achado lendo o código e registre falsos positivos na auditoria.",
  );
  lines.push("");

  for (const slice of result.slices) {
    lines.push(`## Slice \`${slice.name}\``);
    lines.push("");
    lines.push(
      `Camadas: ${Object.entries(slice.layers)
        .map(([layer, files]) => `${layer}=${files.length}`)
        .join(", ")}`,
    );
    lines.push("");

    const relevant = slice.findings.filter(
      (finding) =>
        result.includeMinor ||
        (finding.severity !== "minor" && finding.severity !== "info"),
    );

    if (relevant.length === 0) {
      lines.push("Sem violações detectadas.");
      lines.push("");
      continue;
    }

    const bySeverity = relevant.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

    for (const finding of bySeverity) {
      const location = finding.line
        ? `${finding.file}:${finding.line}`
        : finding.file;
      lines.push(
        `- **${SEVERITY_LABEL[finding.severity]} ${finding.rule}** — ${finding.title} — \`${location}\``,
      );
      lines.push(`  - ${finding.detail}`);
      lines.push(`  - Correção: ${finding.hint}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.root);

  let entries;
  try {
    entries = await readdir(rootDir, { withFileTypes: true });
  } catch {
    console.error(`Root not found: ${rootDir}`);
    process.exit(2);
  }

  const sliceDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(rootDir, entry.name));

  const testCorpus = await buildTestCorpus(path.resolve(rootDir, "..", ".."));
  const slices = [];
  for (const sliceDir of sliceDirs) {
    slices.push(await analyzeSlice({ sliceDir, rootDir, testCorpus }));
  }

  const allFindings = slices.flatMap((slice) => slice.findings);
  const summary = {
    slices: slices.length,
    files: slices.reduce(
      (total, slice) =>
        total +
        Object.values(slice.layers).reduce(
          (sum, files) => sum + files.length,
          0,
        ),
      0,
    ),
    blocker: allFindings.filter((finding) => finding.severity === "blocker")
      .length,
    major: allFindings.filter((finding) => finding.severity === "major").length,
    minor: allFindings.filter((finding) => finding.severity === "minor").length,
    info: allFindings.filter((finding) => finding.severity === "info").length,
  };

  const result = {
    generatedAt: new Date().toISOString(),
    root: toPosix(args.root),
    includeMinor: args.includeMinor,
    summary,
    slices,
  };

  const json = `${JSON.stringify(result, null, 2)}\n`;
  const markdown = renderMarkdown(result);

  if (args.json) {
    await mkdir(path.dirname(path.resolve(args.json)), { recursive: true });
    await writeFile(path.resolve(args.json), json, "utf8");
  }
  if (args.md) {
    await mkdir(path.dirname(path.resolve(args.md)), { recursive: true });
    await writeFile(path.resolve(args.md), markdown, "utf8");
  }

  if (!args.json && !args.md) {
    console.log(markdown);
  } else {
    console.log(
      `Auditoria: ${summary.slices} slices, ${summary.blocker} bloqueadores, ${summary.major} majoritários, ${summary.minor} menores, ${summary.info} info.`,
    );
  }

  process.exit(summary.blocker + summary.major > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
