import assert from "node:assert/strict";
import { test } from "vitest";
import { ehEmailJaCadastrado, ehRateLimitEmail } from "./auth-erros";

test("ehEmailJaCadastrado: por code email_exists", () => {
  assert.equal(ehEmailJaCadastrado({ code: "email_exists" }), true);
  assert.equal(ehEmailJaCadastrado({ code: "user_already_exists" }), true);
});

test("ehEmailJaCadastrado: variações de mensagem do GoTrue", () => {
  assert.equal(ehEmailJaCadastrado({ message: "A user with this email address has already been registered" }), true);
  assert.equal(ehEmailJaCadastrado({ message: "email address already exists" }), true);
  assert.equal(ehEmailJaCadastrado({ message: "User already registered" }), true);
});

test("ehEmailJaCadastrado: erro diferente não é falso positivo", () => {
  assert.equal(ehEmailJaCadastrado({ code: "weak_password", message: "Password is too weak" }), false);
  assert.equal(ehEmailJaCadastrado({ message: "over_email_send_rate_limit" }), false);
  assert.equal(ehEmailJaCadastrado({}), false);
});

test("ehRateLimitEmail: 429 / over_email_send_rate_limit do GoTrue", () => {
  assert.equal(ehRateLimitEmail({ code: "over_email_send_rate_limit" }), true);
  assert.equal(ehRateLimitEmail({ status: 429 }), true);
  assert.equal(ehRateLimitEmail({ message: "email rate limit exceeded" }), true);
  assert.equal(ehRateLimitEmail({ code: "weak_password" }), false);
  assert.equal(ehRateLimitEmail({}), false);
});
