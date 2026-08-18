import { messages } from '../messages/messages.js';

export const requireBothOrNeither = (schema, field1, field2, customMessage) => {
  return schema.refine(
    (data) => {
      const hasField1 = data[field1] !== undefined;
      const hasField2 = data[field2] !== undefined;
      return hasField1 === hasField2;
    },
    {
      message:
        customMessage || messages.GENERAL.INCOMPLETE_PETITION(field1, field2),
      path: [field1],
    },
  );
};
