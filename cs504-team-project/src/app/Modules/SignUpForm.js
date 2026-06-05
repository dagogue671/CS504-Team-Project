"use client";

import React, { useEffect, useRef, useState } from "react";
import "./SignUpForm.css";

export default function SignUpForm() {
  const formRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signupDisabled, setSignupDisabled] = useState(false);

  useEffect(() => {
    const input = passwordRef.current;
    if (!input) return;

    const clearValidity = () => input.setCustomValidity("");
    input.addEventListener("input", clearValidity);
    return () => input.removeEventListener("input", clearValidity);
  }, []);

  function validatePassword() {
    const input = passwordRef.current;
    if (!input) return;

    let message = "";
    if (!/.{8,}/.test(input.value)) {
      message = "At least eight characters.";
    } else if (!/.*[A-Z].*/.test(input.value)) {
      message = "At least one uppercase letter.";
    } else if (!/.*[a-z].*/.test(input.value)) {
      message = "At least one lowercase letter.";
    }

    input.setCustomValidity(message);
  }

  function handleTogglePassword() {
    setShowPassword((value) => !value);
  }

  function handleFormSubmission(event) {
    event.preventDefault();
    validatePassword();

    const form = formRef.current;
    if (!form) return;

    form.reportValidity();
    if (!form.checkValidity()) {
      return;
    }

    setSignupDisabled(true);
    alert("Signed up!");
  }

  return (
    <main>
      <form ref={formRef} method="post" onSubmit={handleFormSubmission}>
        <h1>Sign up</h1>

        <section>
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            pattern="[\p{L}\.\- ]+"
          />
        </section>

        <section>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </section>

        <section>
          <label htmlFor="password">Password</label>
          <button
            id="toggle-password"
            type="button"
            aria-label={
              showPassword
                ? "Hide password."
                : "Show password as plain text. Warning: this will display your password on the screen."
            }
            onClick={handleTogglePassword}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
          <input
            id="password"
            name="password"
            ref={passwordRef}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            aria-describedby="password-constraints"
            required
          />
          <div id="password-constraints">Eight or more characters.</div>
        </section>

        <button id="sign-up" type="submit" disabled={signupDisabled}>
          Sign up
        </button>
      </form>
    </main>
  );
}
