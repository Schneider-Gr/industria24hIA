// Valida a forma dos workflows de automação de revisão via Claude Code
// Action (PR review + issue triage): sintaxe YAML, gatilho certo, permissão
// mínima necessária, uso da action oficial na v1, e que a chave da API vem
// de secret — nunca hardcoded. Não executa a action de verdade (isso exige
// um PR/issue real no GitHub); é o check estático antes do push.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { describe, expect, test } from "vitest";

const workflowsDir = join(import.meta.dirname, "..", ".github", "workflows");

type Workflow = {
  on?: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs: Record<string, { permissions?: Record<string, string>; steps: Array<Record<string, unknown>> }>;
};

function carregarWorkflow(arquivo: string): Workflow {
  const conteudo = readFileSync(join(workflowsDir, arquivo), "utf-8");
  return load(conteudo) as Workflow;
}

function usaClaudeCodeAction(job: Workflow["jobs"][string]) {
  return job.steps.find((s) => typeof s.uses === "string" && (s.uses as string).startsWith("anthropics/claude-code-action@"));
}

describe("claude-pr-review.yml", () => {
  const wf = carregarWorkflow("claude-pr-review.yml");
  const trigger = wf.on as Record<string, unknown>;

  test("dispara em PR aberto e atualizado", () => {
    const pr = trigger.pull_request as { types: string[] };
    expect(pr.types).toEqual(expect.arrayContaining(["opened", "synchronize"]));
  });

  test("job de review usa a action oficial claude-code-action v1", () => {
    const job = Object.values(wf.jobs)[0];
    const step = usaClaudeCodeAction(job);
    expect(step).toBeDefined();
    expect(step!.uses).toBe("anthropics/claude-code-action@v1");
  });

  test("chave da API vem de secret, nunca hardcoded", () => {
    const job = Object.values(wf.jobs)[0];
    const step = usaClaudeCodeAction(job)!;
    const key = (step.with as Record<string, string>).anthropic_api_key;
    expect(key).toBe("${{ secrets.ANTHROPIC_API_KEY }}");
  });

  test("permissão mínima: escreve em PR, não escreve em contents", () => {
    const job = Object.values(wf.jobs)[0];
    const perms = job.permissions ?? wf.permissions ?? {};
    expect(perms["pull-requests"]).toBe("write");
    expect(perms.contents).toBe("read");
  });
});

describe("claude-issue-triage.yml", () => {
  const wf = carregarWorkflow("claude-issue-triage.yml");
  const trigger = wf.on as Record<string, unknown>;

  test("dispara quando issue é aberta", () => {
    const issues = trigger.issues as { types: string[] };
    expect(issues.types).toEqual(["opened"]);
  });

  test("job de triage usa a action oficial claude-code-action v1", () => {
    const job = Object.values(wf.jobs)[0];
    const step = usaClaudeCodeAction(job);
    expect(step).toBeDefined();
    expect(step!.uses).toBe("anthropics/claude-code-action@v1");
  });

  test("chave da API vem de secret, nunca hardcoded", () => {
    const job = Object.values(wf.jobs)[0];
    const step = usaClaudeCodeAction(job)!;
    const key = (step.with as Record<string, string>).anthropic_api_key;
    expect(key).toBe("${{ secrets.ANTHROPIC_API_KEY }}");
  });

  test("permissão mínima: só escreve em issues", () => {
    const job = Object.values(wf.jobs)[0];
    const perms = job.permissions ?? wf.permissions ?? {};
    expect(perms.issues).toBe("write");
    expect(perms.contents).not.toBe("write");
  });
});
