"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  signInWithEmailAndPassword,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from "firebase/auth";
import "./SignInForm.css";

export default function SignInForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signinDisabled, setSigninDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // MFA specific states
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [multiFactorResolver, setMultiFactorResolver] = useState(null); // Stores the MultiFactorResolver object
  const [mfaPhoneNumber, setMfaPhoneNumber] = useState(""); // The phone number for MFA
  const [mfaVerificationCode, setMfaVerificationCode] = useState(""); // User-entered MFA code
  const [mfaVerificationId, setMfaVerificationId] = useState(""); // ID received from Firebase after sending code
  const [isSendingMfaCode, setIsSendingMfaCode] = useState(false);
  const [isVerifyingMfaCode, setIsVerifyingMfaCode] = useState(false);
  const recaptchaVerifierRef = useRef(null); // Ref to store the RecaptchaVerifier instance

  useEffect(() => {
    // Initialize RecaptchaVerifier
    const auth = getAuth();
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-signin', {
        'size': 'invisible', // Invisible reCAPTCHA
        'callback': (response) => {
          console.log("reCAPTCHA solved for sign-in:", response);
        },
        'expired-callback': () => {
          console.log("reCAPTCHA expired for sign-in.");
          if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
            recaptchaVerifierRef.current.clear();
          }
        }
      });
      recaptchaVerifierRef.current.render().then((widgetId) => {
        console.log("reCAPTCHA widget rendered with ID:", widgetId);
      });
    }

    // Original password validation effect
    const input = passwordRef.current;
    if (input) {
      const validate = () => {
        let message = "";
        if (!/.{8,}/.test(input.value)) {
          message = "At least eight characters.";
        } else if (!/.*[A-Z].*/.test(input.value)) {
          message = "At least one uppercase letter.";
        } else if (!/.*[a-z].*/.test(input.value)) {
          message = "At least one lowercase letter.";
        }
        input.setCustomValidity(message);
      };
      input.addEventListener("input", validate);
      return () => {
        input.removeEventListener("input", validate);
        // Clean up reCAPTCHA on unmount
        if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
          recaptchaVerifierRef.current.clear();
        }
      };
    }
  }, []); // Empty dependency array means this runs once on mount

  function handleTogglePassword() {
    setShowPassword((s) => !s);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSigninDisabled(true);
    setErrorMessage("");

    const form = formRef.current;
    if (!form || !form.checkValidity()) {
      setSigninDisabled(false);
      return;
    }

    const formData = new FormData(form);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("current-password") || "");

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      // If successful, user is signed in.
      alert("Welcome back!");
      router.push("/");
    } catch (error) {
      console.error("Firebase sign in error:", error);
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(getAuth(), error);
        setMultiFactorResolver(resolver);
        setShowMfaChallenge(true);
        // Find the phone number associated with MFA. Assuming one phone MFA.
        const phoneFactorInfo = resolver.hints.find(
          (hint) => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID
        );
        if (phoneFactorInfo) {
          setMfaPhoneNumber(phoneFactorInfo.phoneNumber);
          setErrorMessage("Multi-Factor Authentication required. Please verify your phone.");
        } else {
          setErrorMessage("Multi-Factor Authentication required, but no phone factor found.");
        }
      } else {
        setErrorMessage(error.message || "Unable to sign in.");
      }
      setSigninDisabled(false);
    }
  }

  async function sendMfaChallengeCode() {
    if (!mfaPhoneNumber || !multiFactorResolver) {
      setErrorMessage("Missing phone number or MFA resolver.");
      return;
    }
    setIsSendingMfaCode(true);
    setErrorMessage("");

    try {
      const auth = getAuth();
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const id = await phoneAuthProvider.verifyPhoneNumber(
        { phoneNumber: mfaPhoneNumber, session: multiFactorResolver.session },
        recaptchaVerifierRef.current
      );
      setMfaVerificationId(id);
      alert("MFA verification code sent to your phone!");
    } catch (error) {
      console.error("Error sending MFA challenge code:", error);
      setErrorMessage(error.message || "Failed to send MFA verification code.");
      if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
        recaptchaVerifierRef.current.clear(); // Reset reCAPTCHA on error
      }
    } finally {
      setIsSendingMfaCode(false);
    }
  }

  async function completeMfaSignIn() {
    if (!mfaVerificationCode || !mfaVerificationId || !multiFactorResolver) {
      setErrorMessage("Missing MFA verification code or ID.");
      return;
    }
    setIsVerifyingMfaCode(true);
    setErrorMessage("");

    try {
      const phoneAuthCredential = PhoneAuthProvider.credential(
        mfaVerificationId,
        mfaVerificationCode
      );
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(
        phoneAuthCredential
      );
      await multiFactorResolver.resolveSignIn(multiFactorAssertion);

      alert("Signed in successfully with MFA!");
      router.push("/");
    } catch (error) {
      console.error("Error completing MFA sign-in:", error);
      setErrorMessage(error.message || "Failed to verify MFA code.");
    } finally {
      setIsVerifyingMfaCode(false);
    }
  }

  return (
    <form ref={formRef} method="post" id="form" name="form" onSubmit={handleSubmit}>
      <button type="button" className="back-button" onClick={() => router.back()}>
        Back
      </button>
      <h1>Sign in</h1>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {!showMfaChallenge ? (
        <>
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
        </>
      ) : (
        // MFA Challenge Section
        <section>
          <h2>Multi-Factor Authentication</h2>
          <p>A verification code has been sent to {mfaPhoneNumber}. Please enter it below.</p>

          {!mfaVerificationId && (
            <p>If you didn't receive a code or need to resend, click below:</p>
          )}
          <button
            type="button"
            onClick={sendMfaChallengeCode}
            disabled={isSendingMfaCode}
            style={{ marginBottom: '10px' }}
          >
            {isSendingMfaCode ? "Sending Code..." : "Resend Code"}
          </button>

          <label htmlFor="mfa-verification-code">Verification Code</label>
          <input
            id="mfa-verification-code"
            type="text"
            value={mfaVerificationCode}
            onChange={(e) => setMfaVerificationCode(e.target.value)}
            placeholder="123456"
            required
            disabled={isVerifyingMfaCode}
          />
          <button
            type="button"
            onClick={completeMfaSignIn}
            disabled={isVerifyingMfaCode}
          >
            {isVerifyingMfaCode ? "Verifying..." : "Verify Code"}
          </button>
        </section>
      )}
      <div id="recaptcha-container-signin"></div> {/* reCAPTCHA will render here */}
    </form>
  );
}
