import * as authService from '../services/auth.service.js';

/// Controller functions
// Signup
export const signup = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const user = await authService.signup(email, username, password);
    return res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const token = await authService.login(email, username, password);
    return res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
};

// Sync with Google
export const syncGoogle = async (req, res, next) => {
  try {
    const { email, username, firebaseUid } = req.body;
    const { user, isLogin } = await authService.syncGoogle(
      email,
      username,
      firebaseUid,
    );
    return res.status(isLogin ? 200 : 201).json({ user });
  } catch (error) {
    next(error);
  }
};

// Updates current user's email
export const updateUserEmail = async (req, res) => {
  const user = req.user;
  const currentEmail = user.email;
  let firebaseChange;
  try {
    const { email, password } = req.body;

    // First of all, new email is checked to be unique
    const userByEmail = await findByEmail(email);

    // If it exists, then its a bad request error (unless is a new authentication with the same email)
    if (
      (userByEmail && !password) ||
      (userByEmail && password && userByEmail.uid !== user.uid)
    )
      return res.status(400).json({
        errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
      });

    // Lastly, it makes a deep check on Firebase searching for the e-mail
    try {
      const fbUser = await getUserByEmail(email);
      if (fbUser.uid !== user.firebase_uid && password) {
        return res.status(400).json({
          errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
        });
      }
    } catch (error) {
      // User not found is expected if the email is not in use, so any other error is returned
      if (error.code !== 'auth/user-not-found') {
        const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
        if (errorBuilder) {
          const mappedError = errorBuilder({ email });
          return res.status(mappedError.status).json({
            errors: { [mappedError.field]: [mappedError.message] },
          });
        }

        if (error.errors) return res.status(500).json(error.errors);

        return res.status(500).json({
          errors: { general: [messages.UNEXPECTED_ERROR] },
        });
      }
    }

    // Prepares user email update
    const firebaseUpdates = { email };
    if (password) {
      firebaseUpdates.password = password; // If there is password, its added
    }

    // So, email is changed on Firebase
    firebaseChange = await updateFirebaseAccount(
      user.firebase_uid,
      firebaseUpdates,
    );

    if (!firebaseChange)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    // Then is changed on Hermyx database
    const hermyxChange = await _updateUserEmail(user.uid, email);

    if (hermyxChange) return res.status(200).json({ user: hermyxChange });
    else {
      // If email was changed on Firebase but not in Hermyx, it should rollback
      await updateFirebaseAccount(user.firebase_uid, { currentEmail });
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
    }
  } catch (e) {
    console.error(e);
    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (firebaseChange)
      await updateFirebaseAccount(user.firebase_uid, currentEmail);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};
