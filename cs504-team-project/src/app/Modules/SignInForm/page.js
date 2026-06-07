"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./SignInForm.css";
// Client-side sign-in form. Move DOM interactions into React hooks/handlers.
export default function SignInForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signinDisabled, setSigninDisabled] = useState(false);

  useEffect(() => {
    // Keep native validation message in sync when password changes
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

    const input = passwordRef.current;
    input && input.addEventListener("input", validatePassword);
    return () => input && input.removeEventListener("input", validatePassword);
  }, []);

  function handleTogglePassword() {
    setShowPassword((s) => !s);
  }

  function handleSubmit(e) {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      // Let browser show validation UI
      e.preventDefault();
      return;
    }
    // allow form to submit; but disable button to prevent double submit
    setSigninDisabled(true);
  }

  return (
    <form
      ref={formRef}
      action="https://form-server.glitch.me/post"
      method="post"
      id="form"
      name="form"
      onSubmit={handleSubmit}
    >
      <button type="button" className="back-button" onClick={() => router.back()}>
        Back
      </button>
      <h1>Sign in</h1>

      <section>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder=" "
          autoComplete="username"
          required
        />
      </section>

      <section>
        <label htmlFor="current-password">Password</label>
        <input
          id="current-password"
          name="current-password"
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          aria-describedby="password-constraints"
          required
        />
        <button
          id="toggle-password"
          type="button"
          aria-label={showPassword ? "Hide password." : "Show password as plain text. Warning: this will display your password on the screen."}
          onClick={handleTogglePassword}
        >
          {showPassword ? "Hide password" : "Show password"}
        </button>
        <div id="password-constraints">Eight or more characters, with at least one&nbsp;lowercase and one uppercase letter.</div>
      </section>

      <button id="signin" type="submit" disabled={signinDisabled}>
        Sign in
      </button>
    </form>
  );
}
