export const regex = {
  /// Common regex
  /// User regex
  // Sign up
  USERNAME_REGEX: /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]*$/,
  PASSWORD_REGEX: /[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
  PASSWORD_UPPERCASE_REGEX: /[A-Z]/,
  PASSWORD_LOWERCASE_REGEX: /[a-z]/,
  PASSWORD_NUMBER_REGEX: /[0-9]/,
  PASSWORD_SYMBOL_REGEX: /[^A-Za-z0-9]/,
};
