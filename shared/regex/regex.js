export const regex = {
  /// Common regex
  /// User regex
  USER: {
    USERNAME: /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]*$/,
    PASSWORD: {
      BASE: /[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
      UPPERCASE: /[A-Z]/,
      LOWERCASE: /[a-z]/,
      NUMBER: /[0-9]/,
      SYMBOL: /[^A-Za-z0-9]/,
    },
  },
};
