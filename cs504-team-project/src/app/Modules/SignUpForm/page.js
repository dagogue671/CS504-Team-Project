"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  // REMOVE 'getAuth' from this import list
  // signInWithEmailAndPassword,
  // getMultiFactorResolver,
} from "firebase/auth";
import "./SignUpForm.css"; // Assuming your CSS is set up
// Import the initialized auth instance
import { auth } from "../../firebase"; // <-- This 'auth' is the one you should use everywhere

export default function SignUpForm() {
  const router = useRouter();
  const formRef = useRef(null);
  const passwordRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [signupDisabled, setSignupDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // MFA specific states
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isEnrollingMfa, setIsEnrollingMfa] = useState(false);
  const recaptchaVerifierRef = useRef(null); // Ref to store the RecaptchaVerifier instance

  useEffect(() => {
    // Initialize RecaptchaVerifier
    // THIS PART IS CORRECT - it uses the imported 'auth'
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible', // Invisible reCAPTCHA
        'callback': (response) => {
          // reCAPTCHA solved, allow user to proceed
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          // reCAPTCHA expired, reset it
          console.log("reCAPTCHA expired.");
          if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
            recaptchaVerifierRef.current.clear();
          }
        }
      });
      recaptchaVerifierRef.current.render().then((widgetId) => {
        console.log("reCAPTCHA widget rendered with ID:", widgetId);
      });
    }

    const input = passwordRef.current;
    if (!input) return;

    const clearValidity = () => input.setCustomValidity("");
    input.addEventListener("input", clearValidity);
    return () => {
      input.removeEventListener("input", clearValidity);
      // Clean up reCAPTCHA on unmount
      if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
        recaptchaVerifierRef.current.clear();
      }
    };
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

  async function handleFormSubmission(event) {
    event.preventDefault();
    validatePassword();

    const form = formRef.current;
    if (!form) return;

    form.reportValidity();
    if (!form.checkValidity()) {
      return;
    }

    setSignupDisabled(true);
    setErrorMessage("");

    const formData = new FormData(form);
    const email = formData.get("email");
    const password = formData.get("password");
    const name = formData.get("name");

    try {
      // REMOVE THIS LINE: const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth, // Use the imported 'auth' instance
        email,
        password
      );

      alert("Signed up successfully! Now, please enroll in Multi-Factor Authentication.");
      setShowMfaEnrollment(true);
    } catch (error) {
      console.error("Firebase sign up error:", error);
      setErrorMessage(error.message || "Unable to save signup data.");
      setSignupDisabled(false);
    }
  }

  async function sendMfaVerificationCode() {
    if (!phoneNumber) {
      setErrorMessage("Please enter a phone number.");
      return;
    }
    setIsSendingCode(true);
    setErrorMessage("");

    try {
      // REMOVE THIS LINE: const auth = getAuth();
      const currentUser = auth.currentUser; // Use the imported 'auth' instance

      if (!currentUser) {
        throw new Error("No user is currently signed in for MFA enrollment.");
      }

      const multiFactorSession = await multiFactor(currentUser).getSession();

      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: multiFactorSession,
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth); // Use the imported 'auth' instance
      const id = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifierRef.current
      );
      setVerificationId(id);
      alert("Verification code sent to your phone!");
    } catch (error) {
      console.error("Error sending MFA verification code:", error);
      setErrorMessage(error.message || "Failed to send verification code.");
      if (recaptchaVerifierRef.current && recaptchaVerifierRef.current.clear) {
        recaptchaVerifierRef.current.clear();
      }
    } finally {
      setIsSendingCode(false);
    }
  }

  async function completeMfaEnrollment() {
    if (!verificationCode) {
      setErrorMessage("Please enter the verification code.");
      return;
    }
    setIsEnrollingMfa(true);
    setErrorMessage("");

    try {
      // REMOVE THIS LINE: const auth = getAuth();
      const currentUser = auth.currentUser; // Use the imported 'auth' instance

      if (!currentUser) {
        throw new Error("No user is currently signed in for MFA enrollment.");
      }

      const phoneAuthCredential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );

      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(
        phoneAuthCredential
      );

      await multiFactor(currentUser).enroll(multiFactorAssertion);

      alert("Multi-Factor Authentication enrolled successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error completing MFA enrollment:", error);
      setErrorMessage(error.message || "Failed to complete MFA enrollment.");
    } finally {
      setIsEnrollingMfa(false);
    }
  }

  return (
    <main>
      <button type="button" className="back-button" onClick={() => router.back()}>
        Back
      </button>
      <form ref={formRef} method="post" onSubmit={handleFormSubmission}>
        <h1>Sign up</h1>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {!showMfaEnrollment ? (
          <>
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
          </>
        ) : (
          <section>
            <h2>Enroll in Multi-Factor Authentication</h2>
            <p>Please provide your phone number to set up MFA.</p>

            <label htmlFor="phone-number">Phone Number</label>
            <input
              id="phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+15551234567"
              required
              disabled={!!verificationId || isSendingCode}
            />
            <button
              type="button"
              onClick={sendMfaVerificationCode}
              disabled={isSendingCode || !!verificationId}
            >
              {isSendingCode ? "Sending Code..." : "Send Verification Code"}
            </button>

            {!!verificationId && (
              <>
                <label htmlFor="verification-code">Verification Code</label>
                <input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  required
                  disabled={isEnrollingMfa}
                />
                <button
                  type="button"
                  onClick={completeMfaEnrollment}
                  disabled={isEnrollingMfa}
                >
                  {isEnrollingMfa ? "Enrolling..." : "Complete MFA Enrollment"}
                </button>
              </>
            )}
          </section>
        )}
      </form>
      <div id="recaptcha-container"></div>
    </main>
  );
}
