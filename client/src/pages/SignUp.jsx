import { useActionState } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import api from '../config/api';
import { signUpClientSchema } from '@hermyx/shared';

export function SignUp() {
  // Initial state for the React Hook useStateAction
  const initialState = { success: null, errors: {} };

  // Checks if the email is already in use
  async function checkEmailAlreadyInUse(fieldsData) {
    // API call
    const { data, status } = await api.get('/users', {
      params: { email: fieldsData.email },
      // A 404 status is ok, it means the email is not already in use
      validateStatus: (status) =>
        status === 200 || status === 400 || status === 404,
    });

    // If it is, it returns the error
    if (status === 200)
      throw {
        controlledError: true,
        errors: {
          general: [`User with email ${fieldsData.email} already exists.`],
        },
      };
    // If there is a request error, it shows it
    else if (status === 400) {
      throw {
        controlledError: true,
        errors: data.errors,
      };
    }
  }

  // Checks if the username is already in use
  async function checkUsernameAlreadyInUse(fieldsData) {
    // API call
    const { data, status } = await api.get('/users', {
      params: { username: fieldsData.username },
      // A 404 status is ok, it means the username is not already in use
      validateStatus: (status) =>
        status === 200 || status === 400 || status === 404,
    });

    // If it is, it returns the error
    if (status === 200)
      throw {
        controlledError: true,
        errors: {
          general: [`Username ${fieldsData.username} already in use.`],
        },
      };
    // If there is a request error, it shows it
    else if (status === 400) {
      throw {
        controlledError: true,
        errors: data.errors,
      };
    }
  }

  // Creates Firebase user
  async function createFirebaseUser(fieldsData) {
    try {
      // API call
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        fieldsData.email,
        fieldsData.password,
      );

      // If user credential is not received, it returns the error
      if (!userCredential)
        throw {
          controlledError: true,
          errors: { general: [`Could not create new account.`] },
        };
      return userCredential;
    } catch (error) {
      let message = 'Could not create new account';
      let field = 'general';
      console.log(error.code);
      // Firebase errors and exceptions are treated
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = `User with email ${fieldsData.email} already exists.`;
          field = 'email';
          break;

        case 'auth/invalid-email':
          message = 'Please, enter a valid email.';
          field = 'email';
          break;

        case 'auth/weak-password':
          message = 'Please, enter a valid password.';
          field = 'password';
          break;

        case 'auth/missing-password':
          message = 'Please, enter a password.';
          field = 'password';
          break;

        case 'auth/network-request-failed':
          message = 'Connection error, please check your network.';
          break;
      }

      throw {
        controlledError: true,
        errors: { [field]: [message] },
      };
    }
  }

  // Creates Hermyx user
  async function createUser(fieldsData, userCredential) {
    // Otherwise, it creates the account on HermyxBD
    const newUser = {
      username: fieldsData.username,
      email: fieldsData.email,
      firebaseUid: userCredential.user.uid,
    };

    // API call
    const { data, status } = await api.post('/users', newUser, {
      validateStatus: (status) => status === 201 || status === 400,
    });

    // If it does not create it successfully, it deletes account on Firebase and returns the error
    if (status !== 201) {
      // Deletes user
      await deleteUser(userCredential.user);

      // If there is a request error, it shows it
      if (status === 400) {
        throw {
          controlledError: true,
          errors: data.errors,
        };
      }

      throw {
        controlledError: true,
        errors: { general: [`Could not create new account.`] },
      };
    }
  }

  // Action executed when form is sent
  const signUpAction = async (previousState, formData) => {
    // Data is collected
    const fieldsData = Object.fromEntries(formData);

    // Fields validation
    const validatedFields = signUpClientSchema.safeParse(fieldsData);

    if (!validatedFields.success) {
      return {
        success: false,
        errors: validatedFields.error.flatten().fieldErrors,
        data: fieldsData,
      };
    }

    // Necessary checks and operations to create user
    try {
      // Checks if the email is already in use
      await checkEmailAlreadyInUse(fieldsData);

      // Checks if the username is already in use
      await checkUsernameAlreadyInUse(fieldsData);

      // If not, creates user in Firebase Auth
      const userCredential = await createFirebaseUser(fieldsData);

      // And creates user in Hermyx DB
      await createUser(fieldsData, userCredential);

      // Otherwise, its successful
      return { success: true };
    } catch (error) {
      // If it some controlled error found in server
      if (error.controlledError)
        return { success: false, errors: error.errors, data: fieldsData };

      // Any other error
      const errorMessage =
        error.response?.data?.message || error.message || 'Unexpected error';
      return {
        success: false,
        errors: { general: [errorMessage] },
        data: fieldsData,
      };
    }
  };

  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialState,
  );

  return (
    <form action={signUpFormAction} noValidate>
      {state.success && <p className='text-green-600'>Signed up!</p>}
      {state.errors?.general && (
        <p className='text-red-600'>{state.errors.general[0]}</p>
      )}

      <div>
        <label>Username:</label>
        <input
          type='text'
          name='username'
          defaultValue={state.data?.username || ''}
          required
        />
        {state.errors?.username && (
          <p className='text-red-600'>{state.errors.username[0]}</p>
        )}
      </div>

      <div>
        <label>E-mail:</label>
        <input
          type='email'
          name='email'
          defaultValue={state.data?.email || ''}
          required
        />
        {state.errors?.email && (
          <p className='text-red-600'>{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label>Password:</label>
        <input type='password' name='password' required />
        {state.errors?.password && (
          <p className='text-red-600'>{state.errors.password[0]}</p>
        )}
      </div>

      <div>
        <label>Confirm password:</label>
        <input type='password' name='confirmPassword' required />
        {state.errors?.confirmPassword && (
          <p className='text-red-600'>{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      <button type='submit' disabled={isPending}>
        {isPending ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
