import {
  publishMissionSchema,
  draftMissionSchema,
  searchMissionByTitleSchema,
} from '@hermyx/shared';

import { messages } from '@hermyx/shared';
import { createMission } from '../services/MissionsServices';

//New mission action, executed when form is sent
export const createMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);
  const intent = formData.get('intent');

  let validatedFields;

  // Fields validation
  if (intent === 'draft') {
    validatedFields = draftMissionSchema.safeParse(fieldsData);
  } else {
    validatedFields = publishMissionSchema.safeParse(fieldsData);
  }

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    if (intent === 'draft') {
      const success = await createMission({
        ...validatedFields.data,
        status: 'draft',
      });

      if (!success) {
        throw { errors: { general: ['The mission could not be saved.'] } };
      }

      return { success: true, redirectUrl: null, data: null, errors: {} };
    }

    const success = await createMission({
      ...validatedFields.data,
      status: 'pending_payment',
    });
    /*
    If (!created?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: 'The payment could not be initiated.' },
        },
      };
    }
*/

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

export const searchMissionByTitleAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = searchMissionByTitleSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};
