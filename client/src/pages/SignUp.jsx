import { useActionState } from "react";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { auth } from "../config/firebase";

export function SignUp() {
  const initialState = { success: null, errors: {} };

  const signUpAction = async (previousState, formData) => {
    const errors = {};
    const { username, email, password, confirmPassword } =
      Object.fromEntries(formData);

    if (!username || !email || !password || !confirmPassword) {
      errors.general = "All fields are required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.email = "Please, enter a correct e-mail.";
    }
    /*
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (password && !passwordRegex.test(password)) {
      errors.password =
        "Password must have at least 8 characters, an uppercase, a lowercase and a number.";
    }
*/
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    // Field errors
    if (Object.keys(errors).length > 0) {
      return { data: null, errors: errors };
    }

    // Necessary checks to create user, first posible params of search are initialized
    const byEmailParams = new URLSearchParams({
      email: email,
    });

    const byUsernameParams = new URLSearchParams({
      username: username,
    });

    try {
      // Checks if email is already in use
      const existingEmailResponse = await fetch(
        `http://localhost:3000/api/users?${byEmailParams.toString()}`,
      );

      // If it is, it returns the error
      if (existingEmailResponse.status === 200)
        return {
          success: null,
          errors: { general: `User with email ${email} already exists.` },
        };

      // If not, checks if username is already in use
      const existingUsernameResponse = await fetch(
        `http://localhost:3000/api/users?${byUsernameParams.toString()}`,
      );

      // If it is, it returns the error
      if (existingUsernameResponse.status === 200)
        return {
          success: null,
          errors: { general: `Username ${username} already in use.` },
        };

      // If not, creates user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // If user credential is not received, it returns the error
      if (!userCredential)
        return {
          success: null,
          errors: { general: `Could not create new account.` },
        };

      // Otherwise, it creates the account on HermyxBD
      const createAccountResponse = await fetch(
        "http://localhost:3000/api/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
            email: email,
            firebaseUid: userCredential.user.uid,
          }),
        },
      );

      // If it does not create it successfully, it deletes account on Firebase and returns the error
      if (createAccountResponse.status !== 201) {
        // Deletes user
        await deleteUser(userCredential.user);
        console.log("User deleted");
        return {
          success: null,
          errors: { general: `Could not create new account.` },
        };
      }

      // Otherwise, its successful
      return { success: true };
    } catch (e) {
      console.log(e);
      return { success: null, errors: { general: e } };
    }
  };

  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={signUpFormAction} noValidate>
      {state.success && <p className="text-green-600">Signed up!</p>}
      {state.errors?.general && (
        <p className="text-red-600">{state.errors.general}</p>
      )}

      <div>
        <label>Username:</label>
        <input type="text" name="username" required />
      </div>

      <div>
        <label>E-mail:</label>
        <input type="email" name="email" required />
        {state.errors?.email && (
          <p className="text-red-600">{state.errors.email}</p>
        )}
      </div>

      <div>
        <label>Password:</label>
        <input type="password" name="password" required />
        {state.errors?.password && (
          <p className="text-red-600">{state.errors.password}</p>
        )}
      </div>

      <div>
        <label>Confirm password:</label>
        <input type="password" name="confirmPassword" required />
        {state.errors?.confirmPassword && (
          <p className="text-red-600">{state.errors.confirmPassword}</p>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}
